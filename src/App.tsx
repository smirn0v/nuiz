import React, {MouseEvent, useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import '@coreui/coreui/dist/css/coreui.min.css'
import { CCallout } from '@coreui/react'
import * as CryptoJS from 'crypto-js'
import {v4 as uuidv4} from 'uuid'

const s_secret = "some-super-secret-that-will-be-found-by-everyone-but-it-is-not-really-matters"

function _hash(data: string) {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

class Question {
  question: string;
  index: number;
  correctAnswerIdx: number;
  answers: Array<string>;

  constructor(question:string, index: number, correctAnswerIdx: number, answers: Array<string>) {
    this.question = question;
    this.index = index;
    this.correctAnswerIdx = correctAnswerIdx;
    this.answers = answers;
  }

  static parse(index:number, inputMap: Map<string, unknown>): Question | undefined {

    var question = inputMap.get('question');
    var answers = inputMap.get('answers');
    var correctAnswerIndex = inputMap.get('correctAnswerIndex');

    if([question,answers,correctAnswerIndex].includes(undefined)) {
      return;
    }
    
    return new Question(question as string, index, correctAnswerIndex as number, answers as Array<string>);
  }
}

class Quiz {
  name: string;
  questions: Array<Question>;

  constructor(name: string, questions: Array<Question>) {
    this.name = name;
    this.questions = questions;
  }

  static parse(name: string, inputMap: Map<string,unknown>): Quiz | undefined {

    var questionsInput = inputMap.get('questions') as Array<Object>;

    if(questionsInput === undefined) {
      return;
    }

    var questions = questionsInput.map(function(value, index) {
      var questionMap = new Map(Object.entries(value));
      return Question.parse(index, questionMap);
    }).filter(item => item !== undefined) as Array<Question>;

    return new Quiz(name, questions);
  }

}

function App() {

  const [quiz, setQuiz] = useState<Quiz>();

  function reload() {
    setQuiz(new Quiz(quiz!.name, quiz!.questions));
  }

  const handleMouseOverEvent = (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = 'lightgreen';
  }

  const handleMouseOutEvent = (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  }

  const handleMouseUpEvent = (e: MouseEvent<HTMLDivElement>) => {
    var userAnswersStr = localStorage.getItem(quiz!.name)
    
    if(userAnswersStr == null) {
      userAnswersStr = JSON.stringify(Array(quiz?.questions.length).fill(0));
    }

    var userAnswers = JSON.parse(userAnswersStr) as Array<number>;
    var questionIdx = parseInt(e.currentTarget.getAttribute("data-questionidx") || "") || 0;
    var answerIdx = parseInt(e.currentTarget.getAttribute("data-answeridx") || "") || 0;

    userAnswers[questionIdx] = answerIdx;
    localStorage.setItem(quiz!.name, JSON.stringify(userAnswers));

    questionIdx+=1;

    if(questionIdx < quiz!.questions.length) {
      var newurl =window.location.protocol + "//" + window.location.hostname + ":" + window.location.port +
      "?testName="+quiz!.name+"&index="+questionIdx;
      window.history.pushState({path: newurl},'',newurl);
      
    } else {
      var correctAnswers = 0;
      quiz!.questions.forEach((q,i) => {
        if(q.correctAnswerIdx == userAnswers[i]) {
          correctAnswers++;
        }
      })

      const result_rand = uuidv4();
      const result_hash = _hash(s_secret + correctAnswers + result_rand);

      var newurl =window.location.protocol + "//" + window.location.hostname + ":" + window.location.port +
      "?testName="+quiz!.name+"&result="+correctAnswers + "&result-rand="+result_rand+"&result-hash="+result_hash;
      window.history.pushState({path: newurl},'',newurl);
    }

    reload();

  }

  

  function emptyPage() {
    return (
        <div className="c-app c-default-layout">
            <div className="c-wrapper">
                <div className="c-body">
                <p>No test</p>
                </div>
            </div>
        </div>
    )
  }

  // convert to class
  function extractQuestion(): Question | undefined {
    const urlParams = new URLSearchParams(window.location.search);
    var questionIndex: number = parseInt(urlParams.get('index') || "") || 0;
    if (quiz === undefined) {
      return;
    }

    return quiz.questions[questionIndex];
  }

  function shouldShowResult(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    var result = urlParams.get('result') || "";
    var resultRand = urlParams.get('result-rand') || "";
    var resultHash = urlParams.get('result-hash') || "";

    return _hash(s_secret + result + resultRand) == resultHash;
  }

  function resultsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    var result = urlParams.get('result') || "";
    return (
      <div className="c-app c-default-layout">
        <div className="c-wrapper">
          <div className="c-body">
            <p>Результат: {result} из {quiz!.questions.length}</p>
          </div>
        </div>
      </div>
    )
  }

  const getQuiz = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testName = urlParams.get('testName');
    const fullQuizPath = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port+ '/quiz/' + testName + '.json';
    if(testName == '' || testName == null) {
      return;
    }
    const js = await window.fetch(fullQuizPath, {
                                              method: 'GET',
                                              }).then((response) => response.json());

   
    setQuiz(Quiz.parse(testName, new Map(Object.entries(js))));
  }
  
  useEffect(() => { getQuiz(); }, []);

  if(shouldShowResult() && quiz !== undefined) {
    return resultsPage()
  }

  var question = extractQuestion();

  if(question === undefined) {
    return emptyPage();
  }

  const answersJSX = [];
  for (let i = 0; i < question.answers.length; i++) {
    answersJSX.push(<CCallout color="fail"
      onMouseOver={handleMouseOverEvent}
      onMouseOut={handleMouseOutEvent}
      onMouseUp={handleMouseUpEvent}
      data-answeridx={i}
      data-questionidx={question.index}
      >
      {question.answers[i]}
    </CCallout>);
  }


  return (
    <div className="c-app c-default-layout">
      <div className="c-wrapper">
        <div className="c-body">
          <p>{question.question}</p>
          {answersJSX}
        </div>
      </div>
    </div>
  );
}

export default App;
