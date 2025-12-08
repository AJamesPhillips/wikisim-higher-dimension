import { render } from "preact"
import "./index.css"

import "./monkey_patch"

import { Interactable } from "./Interactable.tsx"


function App ()
{
    return <div>
        <Interactable />
        <div id="debug_output"></div>
    </div>
}

render(<App />, document.getElementById("app")!)
