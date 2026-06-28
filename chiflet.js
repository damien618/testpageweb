const MAX_LETTERS = 9;
const MIN_WORD_LENGTH = 2;
const DRAWS_PER_GAME = 10;
const API_TIMEOUT_MS = 3500;
const API_MAX_ATTEMPTS = 2;
const WORD_CACHE_STORAGE_KEY = 'chifletWordCacheV1';
const WORD_AUDIO_LANG = 'fr-FR';

const VOWELS = ['A', 'E', 'I', 'O', 'U', 'Y'];
const CONSONANTS = [
  'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P',
  'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Z'
];

const WORDS = new Set([
  'AIDE', 'AIMER', 'AILE', 'AIMANT', 'ANNE', 'ART', 'BATEAU', 'BON', 'BRAS', 'CAILLOU',
  'CARTE', 'CHALEUR', 'CHEVAL', 'CHIEN', 'CIEL', 'CITRON', 'COEUR', 'COMME', 'DAME', 'DANSE',
  'DROIT', 'ECOLE', 'ECRIRE', 'ENFANT', 'FLEUR', 'FROID', 'GARE', 'GOUTTE', 'GRAND', 'HAUT',
  'HIVER', 'JOUR', 'LUNE', 'MAISON', 'MAMIE', 'MARCHE', 'MELANGE', 'MONTAGNE', 'MOT', 'NUAGE',
  'OISEAU', 'ORANGE', 'PARC', 'PAYS', 'PEINTURE', 'POMME', 'PONT', 'PORTE', 'POULE', 'RIVIERE',
  'ROUGE', 'SABLE', 'SALLE', 'SAVOIR', 'SOURIS', 'SUD', 'TERRAIN', 'TIGRE', 'TOUR', 'TRIANGLE',
  'VOYAGE', 'ZEBRE'
]);

const apiWordCache = new Map();
const persistedWordCache = loadPersistedWordCache();

function loadPersistedWordCache() {
  try {
    const raw = localStorage.getItem(WORD_CACHE_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return new Map();
    return new Map(Object.entries(parsed).map(([key, value]) => [key, Boolean(value)]));
  } catch (error) {
    return new Map();
  }
}

function savePersistedWordCache() {
  try {
    if (persistedWordCache.size > 3000) {
      const oldestKey = persistedWordCache.keys().next().value;
      if (oldestKey) persistedWordCache.delete(oldestKey);
    }
    localStorage.setItem(WORD_CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(persistedWordCache)));
  } catch (error) {
    // Ignore storage failures (private mode/quota) and keep in-memory cache only.
  }
}

function rememberWordResult(normalizedWord, exists) {
  apiWordCache.set(normalizedWord, exists);
  persistedWordCache.set(normalizedWord, exists);
  savePersistedWordCache();
}

function fallbackWordDecision(normalizedWord) {
  if (apiWordCache.has(normalizedWord)) return apiWordCache.get(normalizedWord);
  if (persistedWordCache.has(normalizedWord)) return persistedWordCache.get(normalizedWord);
  return WORDS.has(normalizedWord.toUpperCase());
}

const dom = {
  drawZone: document.getElementById('drawZone'),
  wordZone: document.getElementById('wordZone'),
  currentWord: document.getElementById('currentWord'),
  statusText: document.getElementById('statusText'),
  scoreValue: document.getElementById('scoreValue'),
  drawValue: document.getElementById('drawValue'),
  gameOverBadge: document.getElementById('gameOverBadge'),
  okBtn: document.getElementById('okBtn'),
  resetWordBtn: document.getElementById('resetWordBtn'),
  newDrawBtn: document.getElementById('newDrawBtn'),
  longerWordModal: document.getElementById('longerWordModal'),
  longerWordText: document.getElementById('longerWordText'),
  continueBtn: document.getElementById('continueBtn'),
};

const gameState = {
  drawLetters: [],
  wordLetters: [],
  isChecking: false,
  score: 0,
  drawNumber: 0,
  hasScoredCurrentDraw: false,
  isGameOver: false,
  isPopupOpen: false,
  pendingNextStep: null,
};

function getLetterCounts(letters) {
  const counts = {};
  letters.forEach(letter => {
    counts[letter] = (counts[letter] || 0) + 1;
  });
  return counts;
}

function canBuildWordFromLetters(word, counts) {
  const needed = {};
  for (const letter of word) {
    needed[letter] = (needed[letter] || 0) + 1;
    if (needed[letter] > (counts[letter] || 0)) return false;
  }
  return true;
}

function findLongerWordFromDraw(playerWord) {
  const poolLetters = [
    ...gameState.drawLetters.map(item => item.letter),
    ...gameState.wordLetters.map(item => item.letter),
  ];
  const counts = getLetterCounts(poolLetters);
  const minLength = playerWord.length + 1;
  let bestWord = '';

  WORDS.forEach(candidate => {
    if (candidate.length < minLength) return;
    if (!canBuildWordFromLetters(candidate, counts)) return;

    if (candidate.length > bestWord.length) {
      bestWord = candidate;
      return;
    }

    if (candidate.length === bestWord.length && candidate < bestWord) {
      bestWord = candidate;
    }
  });

  return bestWord;
}

async function findLongerWordByApiExtension(playerWord) {
  const letters = [
    ...gameState.drawLetters.map(item => item.letter),
    ...gameState.wordLetters.map(item => item.letter),
  ].join('').toLowerCase();

  if (!letters) return '';

  const query = new URLSearchParams({ letters });
  const url = `https://api.poocoo.fr/api/v1/words-from-letters?${query.toString()}`;

  for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, { mode: 'cors', signal: controller.signal });
      if (!response.ok) continue;

      const data = await response.json();
      const wordGroups = data?.data?.wordGroups;
      if (!Array.isArray(wordGroups)) continue;

      for (const group of wordGroups) {
        if (!group || group.length <= playerWord.length) continue;
        if (!Array.isArray(group.words) || group.words.length === 0) continue;
        return String(group.words[0] || '').toUpperCase();
      }

      return '';
    } catch (error) {
      // Retry on network/timeout errors.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return '';
}

let modalReturnFocus = null;

function openLongerWordPopup(word, nextStep) {
  dom.longerWordText.textContent = `Un mot plus long était : ${word}`;
  modalReturnFocus = document.activeElement;
  gameState.isPopupOpen = true;
  gameState.pendingNextStep = nextStep;
  dom.longerWordModal.hidden = false;
  render();
  dom.continueBtn.focus();
}

function closeLongerWordPopup() {
  if (!gameState.isPopupOpen) return;

  const nextStep = gameState.pendingNextStep;
  const returnFocus = modalReturnFocus;
  gameState.isPopupOpen = false;
  gameState.pendingNextStep = null;
  modalReturnFocus = null;
  dom.longerWordModal.hidden = true;
  render();

  if (returnFocus && typeof returnFocus.focus === 'function') {
    returnFocus.focus();
  }

  if (nextStep === 'endGame') {
    endGame();
    return;
  }

  if (nextStep === 'newDraw') {
    newDraw();
  }
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function speakWord(word) {
  if (!('speechSynthesis' in window) || !word) return;

  try {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = WORD_AUDIO_LANG;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    // Stop any previous pronunciation to avoid overlapping audio.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    // Keep the game playable even if speech is unavailable.
  }
}

function randomLetter() {
  const isVowel = Math.random() < 0.45;
  return isVowel ? randomItem(VOWELS) : randomItem(CONSONANTS);
}

function createLetterTile(letter) {
  return {
    id: `L-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    letter,
  };
}

function generateDrawLetters() {
  const letters = [];

  const minVowels = 3;

  while (letters.length < MAX_LETTERS) {
    const letter = createLetterTile(randomLetter());
    letters.push(letter);
  }

  const vowelCount = letters.filter(l => VOWELS.includes(l.letter)).length;

  if (vowelCount < minVowels) {
    letters[0] = createLetterTile(randomItem(VOWELS));
  }

  return letters;
}

function setStatus(message, type = 'neutral') {
  dom.statusText.textContent = message;
  dom.statusText.className = `status ${type}`;
}

function renderZone(zoneElement, letters, source) {
  zoneElement.innerHTML = '';

  letters.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'letter-tile';
    btn.textContent = item.letter;
    btn.dataset.id = item.id;
    btn.dataset.source = source;
    btn.draggable = true;
    zoneElement.appendChild(btn);
  });
}

function render() {
  renderZone(dom.drawZone, gameState.drawLetters, 'draw');
  renderZone(dom.wordZone, gameState.wordLetters, 'word');

  const currentWord = gameState.wordLetters.map(item => item.letter).join('');
  dom.currentWord.textContent = `Mot: ${currentWord || '-'}`;
  dom.scoreValue.textContent = String(gameState.score);
  dom.drawValue.textContent = String(gameState.drawNumber);
  dom.gameOverBadge.hidden = !gameState.isGameOver;
  dom.longerWordModal.hidden = !gameState.isPopupOpen;
  dom.okBtn.hidden = gameState.isGameOver;
  dom.resetWordBtn.hidden = gameState.isGameOver;
  dom.okBtn.disabled = gameState.isChecking || gameState.isGameOver || gameState.isPopupOpen;
  dom.resetWordBtn.disabled = gameState.isChecking || gameState.isPopupOpen;
  dom.newDrawBtn.disabled = gameState.isChecking || gameState.isPopupOpen;
}

function moveLetterToWord(letterId) {
  const index = gameState.drawLetters.findIndex(item => item.id === letterId);
  if (index < 0) return;
  const [picked] = gameState.drawLetters.splice(index, 1);
  gameState.wordLetters.push(picked);
  render();
}

function moveLetterBackToDraw(letterId) {
  const index = gameState.wordLetters.findIndex(item => item.id === letterId);
  if (index < 0) return;
  const [picked] = gameState.wordLetters.splice(index, 1);
  gameState.drawLetters.unshift(picked);
  render();
}

function resetCurrentWord() {
  if (gameState.isChecking || gameState.isGameOver || gameState.isPopupOpen) return;
  if (gameState.wordLetters.length === 0) return;
  gameState.drawLetters.push(...gameState.wordLetters);
  gameState.wordLetters = [];
  setStatus('Mot reinitialise. Compose une nouvelle proposition.', 'neutral');
  render();
}

function endGame() {
  gameState.isGameOver = true;
  gameState.isChecking = false;
  gameState.wordLetters = [];
  gameState.drawLetters = [];
  gameState.hasScoredCurrentDraw = false;
  gameState.isPopupOpen = false;
  gameState.pendingNextStep = null;
  dom.longerWordModal.hidden = true;
  setStatus('Clique sur Nouvelle pioche pour commencer une nouvelle partie.', 'neutral');
  render();
}

function newDraw() {
  if (gameState.isPopupOpen) return;

  let statusMessage = 'Nouvelle pioche prete. Compose ton mot.';

  if (gameState.isGameOver) {
    gameState.score = 0;
    gameState.drawNumber = 0;
    gameState.isGameOver = false;
    statusMessage = 'Nouvelle partie: score remis a zero.';
  }

  if (gameState.drawNumber >= DRAWS_PER_GAME) {
    endGame();
    return;
  }

  gameState.drawNumber += 1;
  gameState.drawLetters = generateDrawLetters();
  gameState.wordLetters = [];
  gameState.isChecking = false;
  gameState.hasScoredCurrentDraw = false;
  setStatus(statusMessage, 'neutral');
  render();
}

async function checkPoocooWord(word) {
  const normalizedWord = String(word).trim().toLowerCase();
  if (!normalizedWord) return false;

  if (apiWordCache.has(normalizedWord)) {
    return apiWordCache.get(normalizedWord);
  }

  const query = new URLSearchParams({
    length: String(normalizedWord.length),
    startsWith: normalizedWord,
    endsWith: normalizedWord,
    page: '1',
    pageSize: '200',
  });
  const url = `https://api.poocoo.fr/api/v1/words?${query.toString()}`;

  for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, { mode: 'cors', signal: controller.signal });
      if (!response.ok) continue;

      const data = await response.json();
      const words = data?.data?.words;
      if (!Array.isArray(words)) continue;

      const exists = words.some(item => String(item).toLowerCase() === normalizedWord);
      rememberWordResult(normalizedWord, exists);
      return exists;
    } catch (error) {
      // Retry on network/timeout errors.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const fallback = fallbackWordDecision(normalizedWord);
  rememberWordResult(normalizedWord, fallback);
  return fallback;
}

function getProposedWordFromSelection() {
  return gameState.wordLetters.map(item => item.letter).join('');
}

function ensureMinimumWordLength(proposedWord) {
  if (proposedWord.length >= MIN_WORD_LENGTH) return true;
  setStatus(`Le mot doit contenir au moins ${MIN_WORD_LENGTH} lettres.`, 'bad');
  return false;
}

async function handleValidatedWord(proposedWord) {
  if (gameState.hasScoredCurrentDraw) {
    speakWord(proposedWord);
    setStatus(`Mot valide: ${proposedWord}. Score deja compte pour cette pioche.`, 'neutral');
    return;
  }

  const points = proposedWord.length;
  gameState.score += points;
  gameState.hasScoredCurrentDraw = true;
  speakWord(proposedWord);

  const longerWordFromLocal = findLongerWordFromDraw(proposedWord.toUpperCase());
  const longerWordFromApi = await findLongerWordByApiExtension(proposedWord.toUpperCase());
  const longerWord = longerWordFromApi.length > longerWordFromLocal.length
    ? longerWordFromApi
    : longerWordFromLocal;
  const nextStep = gameState.drawNumber >= DRAWS_PER_GAME ? 'endGame' : 'newDraw';

  if (longerWord) {
    setStatus(`Mot valide: ${proposedWord} (+${points} points).`, 'good');
    openLongerWordPopup(longerWord, nextStep);
    return;
  }

  if (nextStep === 'endGame') {
    setStatus(`Mot valide: ${proposedWord} (+${points} points).`, 'good');
    endGame();
    return;
  }

  setStatus(`Mot valide: ${proposedWord} (+${points} points). Nouvelle pioche automatique.`, 'good');
  newDraw();
}

async function validateCurrentWord() {
  if (gameState.isChecking || gameState.isGameOver || gameState.isPopupOpen) return;

  const proposedWord = getProposedWordFromSelection();
  if (!ensureMinimumWordLength(proposedWord)) return;

  gameState.isChecking = true;
  setStatus('Verification du mot via le dictionnaire francais...', 'neutral');
  render();

  try {
    const exists = await checkPoocooWord(proposedWord.toLowerCase());

    if (!exists) {
      setStatus(`Mot non reconnu: ${proposedWord}`, 'bad');
      return;
    }

    await handleValidatedWord(proposedWord);
  } catch (error) {
    setStatus('Verification interrompue. Reessaye avec le bouton OK.', 'bad');
  } finally {
    gameState.isChecking = false;
    render();
  }
}

function onTileClick(event) {
  if (gameState.isChecking || gameState.isPopupOpen) return;

  const tile = event.target.closest('.letter-tile');
  if (!tile) return;

  const { id, source } = tile.dataset;
  if (source === 'draw') {
    moveLetterToWord(id);
  } else {
    moveLetterBackToDraw(id);
  }
}

function onDragStart(event) {
  if (gameState.isChecking || gameState.isPopupOpen) return;

  const tile = event.target.closest('.letter-tile');
  if (!tile) return;

  const payload = JSON.stringify({
    id: tile.dataset.id,
    source: tile.dataset.source,
  });
  event.dataTransfer.setData('text/plain', payload);
}

function onDropToWord(event) {
  if (gameState.isChecking || gameState.isPopupOpen) return;

  event.preventDefault();
  const payload = event.dataTransfer.getData('text/plain');
  if (!payload) return;

  const data = JSON.parse(payload);
  if (data.source === 'draw') moveLetterToWord(data.id);
}

function onDropToDraw(event) {
  if (gameState.isChecking || gameState.isPopupOpen) return;

  event.preventDefault();
  const payload = event.dataTransfer.getData('text/plain');
  if (!payload) return;

  const data = JSON.parse(payload);
  if (data.source === 'word') moveLetterBackToDraw(data.id);
}

function onModalKeydown(event) {
  if (!gameState.isPopupOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeLongerWordPopup();
    return;
  }

  if (event.key !== 'Tab') return;

  event.preventDefault();
  dom.continueBtn.focus();
}

function initGame() {
  dom.drawZone.addEventListener('click', onTileClick);
  dom.wordZone.addEventListener('click', onTileClick);

  dom.drawZone.addEventListener('dragstart', onDragStart);
  dom.wordZone.addEventListener('dragstart', onDragStart);

  dom.wordZone.addEventListener('dragover', event => event.preventDefault());
  dom.drawZone.addEventListener('dragover', event => event.preventDefault());
  dom.wordZone.addEventListener('drop', onDropToWord);
  dom.drawZone.addEventListener('drop', onDropToDraw);

  dom.okBtn.addEventListener('click', validateCurrentWord);
  dom.resetWordBtn.addEventListener('click', resetCurrentWord);
  dom.newDrawBtn.addEventListener('click', () => {
    if (gameState.isChecking) return;
    newDraw();
  });
  dom.continueBtn.addEventListener('click', closeLongerWordPopup);
  document.addEventListener('keydown', onModalKeydown);

  newDraw();
}

initGame();
