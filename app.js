let currentQuestion = null;


startBtn.onclick = startGame;
nextBtn.onclick = loadQuestion;


async function startGame() {
score = 0;
document.getElementById('start-screen').classList.add('hidden');
game.classList.remove('hidden');
await loadQuestion();
}


async function loadQuestion() {
nextBtn.classList.add('hidden');
answersBox.innerHTML = '';


// Fetch a random question
const { data } = await supabase.rpc('get_random_question');
currentQuestion = data;


questionBox.textContent = currentQuestion.question;


const answers = [
currentQuestion.answer_a,
currentQuestion.answer_b,
currentQuestion.answer_c,
currentQuestion.answer_d,
];


answers.forEach((ans, i) => {
const btn = document.createElement('button');
btn.textContent = ans;
btn.onclick = () => checkAnswer(i + 1);
answersBox.appendChild(btn);
});


timeLeft = 15;
timeDisplay.textContent = timeLeft;
clearInterval(timer);
timer = setInterval(() => {
timeLeft--;
timeDisplay.textContent = timeLeft;


if (timeLeft <= 0) {
clearInterval(timer);
nextBtn.classList.remove('hidden');
}
}, 1000);
}


function checkAnswer(selected) {
clearInterval(timer);


if (selected === currentQuestion.correct_answer) score++;


nextBtn.classList.remove('hidden');
}


async function submitScore() {
const user = (await supabase.auth.getUser()).data.user;
if (!user) return;


await supabase.from('scores').insert({
user_id: user.id,
score,
});
}