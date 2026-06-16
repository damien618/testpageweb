const BOARD_SIZE = 15;
const CENTER = 7;

const LETTERS = [
  { letter: 'A', value: 1, count: 9 },
  { letter: 'B', value: 3, count: 2 },
  { letter: 'C', value: 3, count: 2 },
  { letter: 'D', value: 2, count: 3 },
  { letter: 'E', value: 1, count: 15 },
  { letter: 'F', value: 4, count: 2 },
  { letter: 'G', value: 2, count: 2 },
  { letter: 'H', value: 4, count: 2 },
  { letter: 'I', value: 1, count: 8 },
  { letter: 'J', value: 8, count: 1 },
  { letter: 'K', value: 10, count: 1 },
  { letter: 'L', value: 1, count: 5 },
  { letter: 'M', value: 2, count: 3 },
  { letter: 'N', value: 1, count: 6 },
  { letter: 'O', value: 1, count: 6 },
  { letter: 'P', value: 3, count: 2 },
  { letter: 'Q', value: 8, count: 1 },
  { letter: 'R', value: 1, count: 6 },
  { letter: 'S', value: 1, count: 6 },
  { letter: 'T', value: 1, count: 6 },
  { letter: 'U', value: 1, count: 6 },
  { letter: 'V', value: 4, count: 2 },
  { letter: 'W', value: 10, count: 1 },
  { letter: 'X', value: 10, count: 1 },
  { letter: 'Y', value: 10, count: 1 },
  { letter: 'Z', value: 10, count: 1 },
  { letter: 'JOKER', value: 0, count: 2 },
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

const boardEl = document.getElementById('board');
const rackEl = document.getElementById('rack');
const statusEl = document.getElementById('statusBox');
const scoreEl = document.getElementById('scoreValue');
const scoreBigEl = document.getElementById('scoreBig');
const remainingEl = document.getElementById('remainingValue');
const turnEl = document.getElementById('turnValue');

const validateBtn = document.getElementById('validateBtn');
const swapBtn = document.getElementById('swapBtn');
const resetBtn = document.getElementById('resetBtn');

const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
const special = createSpecialBoard();

let bag = createBag();
let rack = [];
let placedTiles = [];
let score = 0;
let turn = 1;
let firstMove = true;
let selectedRackIndex = null;

function createSpecialBoard() {
  const s = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''));
  const dl = [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 12], [7, 3], [7, 11], [8, 2], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]];
  const dw = [[1, 1], [1, 13], [2, 2], [2, 12], [3, 3], [3, 11], [4, 4], [4, 10], [5, 5], [5, 9], [6, 6], [6, 8], [7, 7], [8, 6], [9, 5], [9, 9], [10, 4], [10, 10], [11, 3], [11, 11], [12, 2], [12, 12], [13, 1], [13, 13]];
  const tl = [[1, 5], [1, 9], [5, 1], [5, 13], [9, 1], [9, 13], [13, 5], [13, 9]];
  const tw = [[0, 0], [0, 14], [7, 0], [7, 14], [14, 0], [14, 14]];
  dl.forEach(([r, c]) => { s[r][c] = 'dl'; });
  dw.forEach(([r, c]) => { s[r][c] = 'dw'; });
  tl.forEach(([r, c]) => { s[r][c] = 'tl'; });
  tw.forEach(([r, c]) => { s[r][c] = 'tw'; });
  s[CENTER][CENTER] = 'star';
  return s;
}

function createBag() {
  const bag = [];
  LETTERS.forEach(({ letter, count }) => {
    for (let i = 0; i < count; i += 1) bag.push(letter);
  });
  return shuffle(bag);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tileValue(letter) {
  return LETTERS.find(item => item.letter === letter)?.value ?? 0;
}

function tileKey(row, col) {
  return `${row}:${col}`;
}

function isPlacedThisTurn(row, col) {
  return placedTiles.some(tile => tile.row === row && tile.col === col);
}

function hasTile(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && Boolean(board[row][col]);
}

function hasExistingTile(row, col) {
  return hasTile(row, col) && !isPlacedThisTurn(row, col);
}

function getSpecialType(row, col) {
  return special[row][col] === 'star' ? 'dw' : special[row][col];
}

function askJokerLetter() {
  const answer = window.prompt('Quelle lettre ce joker représente-t-il ?');
  if (answer === null) return null;

  const letter = answer.trim().toUpperCase();
  if (!/^[A-Z]$/.test(letter)) {
    statusEl.innerHTML = 'Le joker doit représenter une seule lettre de A à Z.';
    return null;
  }

  return letter;
}

function createBoardTileFromRack(tile) {
  if (tile !== 'JOKER') {
    return { letter: tile, value: tileValue(tile), placed: true, rackLetter: tile, isJoker: false };
  }

  const jokerLetter = askJokerLetter();
  if (!jokerLetter) return null;
  return { letter: jokerLetter, value: 0, placed: true, rackLetter: 'JOKER', isJoker: true };
}

function drawRack() {
  while (rack.length < 7 && bag.length > 0) {
    rack.push(bag.pop());
  }
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `board-cell ${special[row][col] || ''}`;
      const tile = board[row][col];
      if (tile) {
        cell.classList.add('tile-cell');
        cell.innerHTML = `
          <div class="board-tile ${tile.placed ? 'placed' : ''} ${tile.isJoker ? 'joker' : ''}">
            ${tile.letter}${tile.isJoker ? '<span class="joker-mark">?</span>' : ''}
            <small>${tile.value || 0}</small>
          </div>`;
      } else {
        const label = special[row][col] === 'star' ? '★' : (special[row][col] ? special[row][col].toUpperCase() : '');
        cell.innerHTML = label ? `<span>${label}</span>` : '<span></span>';
      }
      cell.addEventListener('click', () => placeTileOnBoard(row, col));
      cell.addEventListener('dragover', event => event.preventDefault());
      cell.addEventListener('drop', event => {
        event.preventDefault();
        const payload = event.dataTransfer.getData('text/plain');
        if (!payload) return;
        const { index } = JSON.parse(payload);
        placeTileFromRack(index, row, col);
      });
      boardEl.appendChild(cell);
    }
  }
}

function renderRack() {
  rackEl.innerHTML = '';
  rackEl.classList.toggle('empty', rack.length === 0);
  rack.forEach((tile, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `rack-tile ${tile === 'JOKER' ? 'joker' : ''} ${selectedRackIndex === index ? 'selected' : ''}`;
    button.textContent = tile === 'JOKER' ? '?' : tile;
    button.dataset.index = String(index);
    button.addEventListener('click', () => toggleRackSelection(index));
    button.draggable = true;
    button.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', JSON.stringify({ index }));
      button.classList.add('selected');
    });
    button.addEventListener('dragend', () => button.classList.remove('selected'));
    const small = document.createElement('small');
    small.textContent = String(tileValue(tile));
    button.appendChild(small);
    rackEl.appendChild(button);
  });
}

function toggleRackSelection(index) {
  selectedRackIndex = selectedRackIndex === index ? null : index;
  renderRack();
}

function placeTileFromRack(index, row, col) {
  const rackIndex = Number(index);
  const tile = rack[rackIndex];
  if (!tile || board[row][col]) {
    statusEl.innerHTML = 'Impossible de placer cette lettre ici.';
    return;
  }

  const boardTile = createBoardTileFromRack(tile);
  if (!boardTile) return;

  board[row][col] = boardTile;
  placedTiles.push({ row, col, ...boardTile, rackIndex });
  rack.splice(rackIndex, 1);
  selectedRackIndex = null;
  renderBoard();
  renderRack();
  statusEl.innerHTML = `Tuile placée en (${row + 1}, ${col + 1}). Validez pour marquer le mot.`;
}

function placeTileOnBoard(row, col) {
  if (selectedRackIndex === null) return;
  placeTileFromRack(selectedRackIndex, row, col);
}

function findPlacementDirection() {
  const sameRow = new Set(placedTiles.map(tile => tile.row)).size === 1;
  const sameCol = new Set(placedTiles.map(tile => tile.col)).size === 1;

  if (placedTiles.length > 1) {
    if (sameRow) return 'horizontal';
    if (sameCol) return 'vertical';
    return null;
  }

  const [{ row, col }] = placedTiles;
  if (hasTile(row, col - 1) || hasTile(row, col + 1)) return 'horizontal';
  if (hasTile(row - 1, col) || hasTile(row + 1, col)) return 'vertical';
  return 'horizontal';
}

function validateContinuity(direction) {
  if (!direction) {
    return { ok: false, message: 'Les lettres doivent être alignées sur une seule ligne ou une seule colonne.' };
  }

  if (placedTiles.length === 1) return { ok: true };

  const rows = placedTiles.map(tile => tile.row);
  const cols = placedTiles.map(tile => tile.col);

  if (direction === 'horizontal') {
    const row = rows[0];
    for (let col = Math.min(...cols); col <= Math.max(...cols); col += 1) {
      if (!board[row][col]) {
        return { ok: false, message: 'Le mot contient un trou non comblé par une lettre déjà posée.' };
      }
    }
  } else {
    const col = cols[0];
    for (let row = Math.min(...rows); row <= Math.max(...rows); row += 1) {
      if (!board[row][col]) {
        return { ok: false, message: 'Le mot contient un trou non comblé par une lettre déjà posée.' };
      }
    }
  }

  return { ok: true };
}

function isConnectedToBoard() {
  if (firstMove) {
    return Boolean(board[CENTER][CENTER] && isPlacedThisTurn(CENTER, CENTER));
  }

  return placedTiles.some(({ row, col }) => (
    hasExistingTile(row - 1, col) ||
    hasExistingTile(row + 1, col) ||
    hasExistingTile(row, col - 1) ||
    hasExistingTile(row, col + 1)
  ));
}

function buildLine(row, col, deltaRow, deltaCol) {
  let startRow = row;
  let startCol = col;

  while (hasTile(startRow - deltaRow, startCol - deltaCol)) {
    startRow -= deltaRow;
    startCol -= deltaCol;
  }

  const cells = [];
  let currentRow = startRow;
  let currentCol = startCol;
  while (hasTile(currentRow, currentCol)) {
    const tile = board[currentRow][currentCol];
    cells.push({
      row: currentRow,
      col: currentCol,
      letter: tile.letter,
      value: tile.value,
      isNew: isPlacedThisTurn(currentRow, currentCol),
    });
    currentRow += deltaRow;
    currentCol += deltaCol;
  }

  return {
    word: cells.map(cell => cell.letter).join('').toUpperCase(),
    cells,
  };
}

function buildPrimaryWord(direction) {
  const firstTile = placedTiles[0];
  return direction === 'horizontal'
    ? buildLine(firstTile.row, firstTile.col, 0, 1)
    : buildLine(firstTile.row, firstTile.col, 1, 0);
}

function buildSecondaryWords(direction) {
  const perpendicular = direction === 'horizontal'
    ? { deltaRow: 1, deltaCol: 0 }
    : { deltaRow: 0, deltaCol: 1 };

  return placedTiles
    .map(tile => buildLine(tile.row, tile.col, perpendicular.deltaRow, perpendicular.deltaCol))
    .filter(line => line.cells.length > 1);
}

function buildFormedWords(direction) {
  const words = [buildPrimaryWord(direction), ...buildSecondaryWords(direction)];
  const seen = new Set();

  return words.filter(line => {
    if (line.cells.length < 2) return false;
    const key = line.cells.map(cell => tileKey(cell.row, cell.col)).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateWordScore(line) {
  let base = 0;
  let wordMultiplier = 1;

  for (const cell of line.cells) {
    let letterScore = cell.value;

    // Les bonus ne se déclenchent que pour les tuiles posées pendant ce tour.
    if (cell.isNew) {
      const type = getSpecialType(cell.row, cell.col);
      if (type === 'dl') letterScore *= 2;
      if (type === 'tl') letterScore *= 3;
      if (type === 'dw') wordMultiplier *= 2;
      if (type === 'tw') wordMultiplier *= 3;
    }

    base += letterScore;
  }

  return base * wordMultiplier;
}

function calculateScore(words) {
  return words.reduce((total, word) => total + calculateWordScore(word), 0);
}

function cancelPlacedTiles(message) {
  [...placedTiles].reverse().forEach(tile => {
    const insertAt = Math.min(tile.rackIndex ?? rack.length, rack.length);
    rack.splice(insertAt, 0, tile.rackLetter || tile.letter);
    board[tile.row][tile.col] = null;
  });

  placedTiles = [];
  selectedRackIndex = null;
  renderBoard();
  renderRack();
  if (message) statusEl.innerHTML = message;
}

function finalizePlacedTiles() {
  placedTiles.forEach(tile => {
    if (board[tile.row][tile.col]) {
      board[tile.row][tile.col].placed = false;
    }
  });
  placedTiles = [];
}

async function validateWord() {
  if (placedTiles.length === 0) {
    statusEl.innerHTML = 'Aucune lettre n’a été placée.';
    return;
  }

  const direction = findPlacementDirection();
  const continuity = validateContinuity(direction);
  if (!continuity.ok) {
    cancelPlacedTiles(`${continuity.message} Les lettres déposées ont été remises dans votre rack.`);
    return;
  }

  if (!isConnectedToBoard()) {
    const message = firstMove
      ? 'Le premier mot doit couvrir la case centrale ★.'
      : 'Le mot doit être connecté à au moins une lettre déjà posée.';
    cancelPlacedTiles(`${message} Les lettres déposées ont été remises dans votre rack.`);
    return;
  }

  const formedWords = buildFormedWords(direction);
  if (formedWords.length === 0) {
    cancelPlacedTiles('Le coup doit former au moins un mot de deux lettres. Les lettres déposées ont été remises dans votre rack.');
    return;
  }

  const wordsLabel = formedWords.map(item => item.word).join(', ');
  statusEl.innerHTML = `Vérification des mots « ${wordsLabel} » via le dictionnaire Scrabble...`;

  for (const formedWord of formedWords) {
    const exists = await checkPoocooWord(formedWord.word.toLowerCase());
    if (!exists) {
      cancelPlacedTiles(`Mot non reconnu dans le dictionnaire Scrabble : « ${formedWord.word} ». Les lettres déposées ont été remises dans votre rack.`);
      return;
    }
  }

  const points = calculateScore(formedWords);
  score += points + (placedTiles.length === 7 ? 50 : 0);
  statusEl.innerHTML = `Mot validé : ${wordsLabel} (+${points} points${placedTiles.length === 7 ? ' + bonus 50' : ''}).`;

  finalizePlacedTiles();
  firstMove = false;
  turn += 1;
  drawRack();
  renderBoard();
  renderRack();
  updateStats();

  if (bag.length === 0 && rack.length === 0) {
    statusEl.innerHTML += ' Partie terminée : le sac est vide.';
  }
}

async function checkPoocooWord(word) {
  try {
    const normalizedWord = String(word).trim().toLowerCase();
    if (!normalizedWord) return false;

    const query = new URLSearchParams({
      length: String(normalizedWord.length),
      startsWith: normalizedWord,
      endsWith: normalizedWord,
      page: '1',
      pageSize: '200',
    });
    const url = `https://api.poocoo.fr/api/v1/words?${query.toString()}`;
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return WORDS.has(normalizedWord.toUpperCase());

    const data = await response.json();
    const words = data?.data?.words;
    if (!Array.isArray(words)) return WORDS.has(normalizedWord.toUpperCase());

    return words.some(item => String(item).toLowerCase() === normalizedWord);
  } catch (error) {
    return WORDS.has(String(word).toUpperCase());
  }
}

function swapLetters() {
  if (selectedRackIndex === null) {
    statusEl.innerHTML = 'Choisissez une lettre à échanger.';
    return;
  }
  if (bag.length < 7) {
    statusEl.innerHTML = 'Il faut au moins 7 lettres dans le sac pour échanger.';
    return;
  }

  const selectedTile = rack[selectedRackIndex];
  if (!selectedTile) {
    selectedRackIndex = null;
    renderRack();
    statusEl.innerHTML = 'Choisissez une lettre valide à échanger.';
    return;
  }

  if (placedTiles.length > 0) {
    cancelPlacedTiles();
    selectedRackIndex = rack.indexOf(selectedTile);
  }

  const tile = rack[selectedRackIndex];
  if (!tile) {
    selectedRackIndex = null;
    renderRack();
    statusEl.innerHTML = 'Choisissez une lettre valide à échanger.';
    return;
  }

  bag.push(tile);
  bag = shuffle(bag);
  rack.splice(selectedRackIndex, 1);
  selectedRackIndex = null;
  drawRack();
  renderRack();
  turn += 1;
  statusEl.innerHTML = `Tuile ${tile === 'JOKER' ? 'Joker' : tile} échangée.`;
  updateStats();
}

function updateStats() {
  scoreEl.textContent = String(score);
  scoreBigEl.textContent = String(score);
  remainingEl.textContent = String(bag.length);
  turnEl.textContent = String(turn);
}

function resetGame() {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      board[r][c] = null;
    }
  }
  bag = createBag();
  rack = [];
  placedTiles = [];
  score = 0;
  turn = 1;
  firstMove = true;
  selectedRackIndex = null;
  drawRack();
  renderBoard();
  renderRack();
  updateStats();
  statusEl.innerHTML = 'Nouvelle partie lancée. Le premier mot doit passer par la case centrale ★.';
}

function initGame() {
  const requiredElements = [
    boardEl,
    rackEl,
    statusEl,
    scoreEl,
    scoreBigEl,
    remainingEl,
    turnEl,
    validateBtn,
    swapBtn,
    resetBtn,
  ];

  if (requiredElements.some(element => !element)) {
    console.error('Initialisation Scrabble impossible: élément(s) DOM manquant(s).');
    return;
  }

  validateBtn.addEventListener('click', validateWord);
  swapBtn.addEventListener('click', swapLetters);
  resetBtn.addEventListener('click', resetGame);
  resetGame();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
