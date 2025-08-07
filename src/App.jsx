import {useEffect, useState} from 'react'
import axios from "axios";
import './App.css'

function App() {
    const [step, setStep] = useState(0);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [questions, setQuestions] = useState([]);
    const [name, setName] = useState("");
    const [id, setId] = useState(0);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        axios.get("http://localhost:9030/fm1/questions", {
            params: {
                phone: phoneNumber,
                name: name,
            }
        })
            .then(response => {
                setQuestions(response.data.questions)
            })
    }, []);


    return (
        <>
            <div>
                <div style={{
                    fontSize: 32,
                    fontWeight: "bold"
                }}>
                    Digital Finance Advisor
                </div>
                {
                    step === 0 &&
                    <>
                        <input
                            placeholder={"Enter your phone number"}
                            value={phoneNumber}
                            onChange={(event) => {setPhoneNumber(event.target.value)}}
                        />
                        <input
                            placeholder={"Enter your name"}
                            value={name}
                            onChange={(event) => {setName(event.target.value)}}
                        />

                        <button onClick={() => {
                            axios.get("http://localhost:9030/fm1/add-user", {
                                params: {
                                    phone: phoneNumber,
                                    name: name,
                                }
                            })
                                .then(response => {
                                    setId(response.data.value);
                                    setStep(1)
                                })}
                        }>
                            Next
                        </button>
                    </>
                }
                {
                    step === 1 &&
                    <>
                        {
                            questions.map((item) => {
                                return (
                                    <div key={item.id} style={{ margin: 10 }}>
                                        <span>{item.question}</span>
                                        <input
                                            value={answers[item.id] || ""}
                                            onChange={(event) => {
                                                setAnswers(prev => ({
                                                    ...prev,
                                                    [item.id]: event.target.value
                                                }));
                                            }}
                                        />
                                    </div>
                                )
                            })
                        }
                        <button onClick={() => {
                            axios.get("http://localhost:9030/fm1/submit", {
                                params: {
                                    userId: id,
                                    data: JSON.stringify(answers)
                                }
                            })
                                .then(response => {
                                    setStep(2)
                                })}
                        }>
                            Submit Answers
                        </button>


                    </>
                }

                {
                    step === 2 &&
                    <>
                    Analyze the answers:
                    </>
                }

            </div>
        </>
    )
}
















export default App
