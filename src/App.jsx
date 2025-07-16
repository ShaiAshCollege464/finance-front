import {useState} from 'react'
import axios from "axios";
import './App.css'

function App() {
    const [step, setStep] = useState(0);
    const [id, setId] = useState("");

    return (
        <>
            <div>
                <h1>
                    Digital Finance Advisor
                </h1>
                {
                    step == 0 &&
                    <>
                        <button onClick={() => {
                            setStep(1);
                        }}>Start</button>

                    </>
                }
                {
                    step == 1 &&
                    <>
                        <input placeholder={"Enter your ID: "} value={id} onChange={(event) => {
                            setId(event.target.value)
                        }}/>
                        <>
                            <button onClick={() => {
                                axios.get("http://localhost:9030/fm1/start")
                                    .then(response => {
                                        alert(response.data.error)
                                    })}}
                            >Next</button>
                        </>
                    </>
                }
            </div>
        </>
    )
}

export default App
