// A significant amount of this file was created by LLMs.
// Only 3 of the prompts and none of the models used were kept by VisualStudio
// code.  These 3 (minor) prompts have been added to this commit message.
import { useEffect, useRef, useState } from "preact/hooks"
import * as THREE from "three"

import "./Interactable.css"


export const Interactable = () =>
{
    const canvas_ref = useRef<HTMLCanvasElement>(null)
    const [slider_value, set_slider_value] = useState(0)
    const request_ref = useRef<number>()

    // Target "Unified" position (isometric-ish view)
    const target_pos = new THREE.Vector3(3, 3, 3)

    // Camera 1 Start (Side view -> Rectangle)
    const cam1_start = new THREE.Vector3(0, 0, 5)

    // Camera 2 Start (Top view -> Circle)
    const cam2_start = new THREE.Vector3(0, 5, 0)

    // We need a way to update the render loop with the new slider value without recreating the scene.
    const slider_value_ref = useRef(slider_value)
    useEffect(() => {
        slider_value_ref.current = slider_value
    }, [slider_value])

    useEffect(() => {
        if (!canvas_ref.current) return

        const canvas = canvas_ref.current
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)

        // Handle resize
        const handle_resize = () =>
        {
            const width = canvas.clientWidth
            const height = canvas.clientHeight
            renderer.setSize(width, height, false) // false disables setting the canvas style size
        }
        window.addEventListener("resize", handle_resize)
        handle_resize() // Initial size

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf0f0f0)

        // Lighting
        const ambient_light = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambient_light)
        const max_dir_light_intensity = 3.0
        const dir_light = new THREE.DirectionalLight(0xffffff, max_dir_light_intensity)
        dir_light.position.set(25, 10, 7)
        scene.add(dir_light)

        scene.add(make_cylinder())

        // Cameras
        const frustum_size = 4
        const aspect = (canvas.clientWidth / 2) / canvas.clientHeight
        const camera1 = new THREE.OrthographicCamera(
            frustum_size * aspect / -2,
            frustum_size * aspect / 2,
            frustum_size / 2,
            frustum_size / -2,
            0.1,
            100
        )
        const camera2 = new THREE.OrthographicCamera(
            frustum_size * aspect / -2,
            frustum_size * aspect / 2,
            frustum_size / 2,
            frustum_size / -2,
            0.1,
            100
        )

        // Interaction state
        let is_dragging = false
        let previous_y = 0

        const onPointerDown = (e: PointerEvent) => {
            is_dragging = true
            previous_y = e.clientY
            canvas.setPointerCapture(e.pointerId)
        }

        const onPointerMove = (e: PointerEvent) => {
            if (!is_dragging) return
            const delta_y = e.clientY - previous_y
            previous_y = e.clientY

            const sensitivity = 0.5
            const current_val = slider_value_ref.current
            const new_val = Math.max(0, Math.min(100, current_val - delta_y * sensitivity))
            set_slider_value(new_val)
        }

        const onPointerUp = (e: PointerEvent) => {
            is_dragging = false
            canvas.releasePointerCapture(e.pointerId)
        }

        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerup", onPointerUp)
        canvas.addEventListener("pointercancel", onPointerUp)

        const animate = () => {
            request_ref.current = requestAnimationFrame(animate)

            const t = slider_value_ref.current / 100 // 0 to 1

            // Update Lighting for Flat -> 3D effect
            // t=0: Flat (High Ambient, No Directional)
            // t=1: 3D (Normal Ambient, Normal Directional)
            ambient_light.intensity = THREE.MathUtils.lerp(2.5, 0.6, t)
            dir_light.intensity = THREE.MathUtils.lerp(0.0, max_dir_light_intensity, t)

            // Update Camera 1 (Left)
            camera1.position.lerpVectors(cam1_start, target_pos, t)
            camera1.lookAt(0, 0, 0)

            // Update Camera 2 (Right)
            camera2.position.lerpVectors(cam2_start, target_pos, t)
            camera2.lookAt(0, 0, 0)

            const width = canvas.clientWidth
            const height = canvas.clientHeight

            // Adjust frustum size for narrow screens (zoom out by 30% if < 600px)
            const is_narrow = width < 600
            const current_frustum_size = is_narrow ? frustum_size * 1.3 : frustum_size

            // Update frustums in case of resize
            const current_aspect = (width / 2) / height

            const cameras = [camera1, camera2]
            for (const cam of cameras)
            {
                cam.left = -current_frustum_size * current_aspect / 2
                cam.right = current_frustum_size * current_aspect / 2
                cam.top = current_frustum_size / 2
                cam.bottom = -current_frustum_size / 2
                cam.updateProjectionMatrix()
            }

            // Render Left View
            const left_x = 0
            const bottom_y = 0
            const view_width = width / 2

            renderer.setViewport(left_x, bottom_y, view_width, height)
            renderer.setScissor(left_x, bottom_y, view_width, height)
            renderer.setScissorTest(true)
            scene.background = new THREE.Color(0xf0f0f0)
            renderer.render(scene, camera1)

            // Render Right View
            const right_x = width / 2
            renderer.setViewport(right_x, bottom_y, view_width, height)
            renderer.setScissor(right_x, bottom_y, view_width, height)
            renderer.setScissorTest(true)
            scene.background = new THREE.Color(0xe0e0e0) // Slightly different background to distinguish
            renderer.render(scene, camera2)
        }

        animate()

        return () => {
            if (request_ref.current) cancelAnimationFrame(request_ref.current)
            window.removeEventListener("resize", handle_resize)

            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerup", onPointerUp)
            canvas.removeEventListener("pointercancel", onPointerUp)

            renderer.dispose()
        }
    }, [])

    const animation_in_progress = useRef<number | undefined>(undefined)
    const toggle_unifying_perspectives = () =>
    {
        const animation_id = Math.random()
        animation_in_progress.current = animation_id
        const start = slider_value
        const end = slider_value === 100 ? 0 : 100
        const duration = 1500 // ms
        const startTime = performance.now()

        const animate_slider = (currentTime: number) => {
            if (animation_in_progress.current !== animation_id) return // Cancelled

            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 2)

            const newValue = start + (end - start) * ease
            set_slider_value(newValue)

            if (progress < 1) {
                requestAnimationFrame(animate_slider)
            }
        }
        requestAnimationFrame(animate_slider)
    }

    const is_conflicted = slider_value < 100
    const class_conflicted = is_conflicted ? " conflicted" : ""

    return <>
        <h1>What is Both a Rectangle And a Circle?</h1>
        <div className="sim-container">

            <canvas ref={canvas_ref} className="sim-canvas" />

            <div className="ui-overlay">
                <div className="labels">
                    <div className="label">Perspective A</div>
                    <div className="label">Perspective B</div>
                </div>
            </div>

            <div className="controls">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={slider_value}
                    onInput={(e) => set_slider_value(parseFloat((e.target as HTMLInputElement).value))}
                    className="slider"
                />
                <div className="slider-labels">
                    <span>Conflicting</span>
                    <span>Unified</span>
                </div>

                <button onClick={toggle_unifying_perspectives} className={"toggle-unify-button" + class_conflicted}>
                    {is_conflicted ? "Unify Conflicting Perspectives" : "Show Conflicting Perspectives"}
                </button>
            </div>
        </div>
        <p>
            It's not possible to answer this question in just two dimensions and many
            other questions at lower dimensions. But if you
            think in higher dimensions then often conflicting ideas can become true at once.
            In this example, a 3D cylinder in 2D looked like a
            rectangle from one angle and a circle from another. Where else in life can
            two viewpoints seem to clash, yet both make sense depending on how you look
            at them? And can you “step up” to a higher level of thinking to connect them?
        </p>
    </>
}


function make_cylinder(): THREE.Mesh
{
    const geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 64)

    const side_material = new THREE.MeshStandardMaterial({
        color: 0x6582f9,
        emissive: 0x072534,
        side: THREE.DoubleSide,
        flatShading: false
    })

    const cap_material = new THREE.MeshStandardMaterial({
        color: 0x6582f9,
        emissive: 0x072534,
        // This is a yellow colour but have decided to keep it all blue.
        // color: 0xffaa00,
        // emissive: 0xa09800,
        side: THREE.DoubleSide,
        flatShading: false
    })

    // Provide materials in order: side, top, bottom.
    const cylinder = new THREE.Mesh(geometry, [side_material, cap_material, cap_material])

    return cylinder
}
