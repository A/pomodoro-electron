import {
  app,
  BrowserWindow,
  Menu,
  Tray,
} from 'electron';
import * as path from 'path';
import * as Timer from 'timer.js';

const ASSETS_DIRRECTORY = path.join(__dirname, '../assets');
const ICON_DEFAULT = 'default.png';
const ICON_IN_PROGRESS = 'in-progress.png';

const BREAK_DURATION = 10; // 10m
const POMODORO_DURATION = 30; // 30m

let finishedAmount = 0;
let cancelledAmount = 0;
let breaksAmount = 0;

let tray: any = null;
let timer: any = null;


const menuTemplate: Electron.MenuItemConstructorOptions[] = [
  {
    click: () => startTimer(POMODORO_DURATION),
    label: `Focus for ${POMODORO_DURATION}m`,
  },
  {
    click: () => startTimer(BREAK_DURATION, true),
    label: `Break for ${BREAK_DURATION}m`,
  },
  {
    click: () => stopTimer(),
    label: 'Record Distraction',
  },
  {
    enabled: false,
    label: getFinishedLabel(),
  },
  {
    enabled: false,
    label: getCancelledLabel(),
  },
  {
    enabled: false,
    label: getBreaksLabel(),
  },
  // { type: 'separator' },
  {
    click: () => app.quit(),
    label: 'Quit',
  },
];

const finishedMenuItemIndex = 3;
const cancelledMenuItemIndex = 4;
const breaksMenuItemIndex = 5;

/**
 * Start App
 */
app.dock.hide();
app.on('ready', () => {
  createTray();
  renderMenu();
});

/**
 * Create Tray with default state
 */
const createTray = () => {
  tray = new Tray(path.join(ASSETS_DIRRECTORY, ICON_DEFAULT));
  resetTrayTime();
};

/**
 * Render/Update menu items, relays on mutable menuTemplate
 */
const renderMenu = () => {
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
};

/**
 * Resets tray time to zeros
 */
const resetTrayTime = () => {
  tray.setImage(path.join(ASSETS_DIRRECTORY, ICON_DEFAULT));
  tray.setTitle('00:00');
};


/**
 * Creates and starts new timer for given minutes
 * @param {Number} minutes Timeout in minutes
 * @param {Function} onTick On-tick callback
 * @param {Function} onEnd On-tick callback
 * @returns {Void}
 */

interface ICreateTimerFn {
  minutes: number;
  onTick: (ms: number) => void;
  onEnd: () => void;
}

const createTimer = ({ minutes, onTick, onEnd }: ICreateTimerFn) => {
  timer = new Timer({
    onend: () => onEnd(),
    ontick: (ms: number) => onTick(ms),
    tick: 1,
  });
  timer.start(minutes * 60);
  return timer;
};


/**
 * Starts new timer and kill the previous one if exists
 * @param {Number} minutes
 * @returns {void}
 */
const startTimer = (minutes: number, isBreak = false) => {
  stopTimer();
  tray.setImage(path.join(ASSETS_DIRRECTORY, ICON_IN_PROGRESS));
  timer = createTimer({
    minutes,
    onEnd: () => {
      isBreak
        ? recordBreak()
        : recordFinishedTimer();
      resetTrayTime();
    },
    onTick: (ms) => {
      const [MM, SS] = castToMMSS(ms);
      tray.setTitle(`${MM}:${SS}`);
    },
  });
  timer.isBreak = isBreak;
};


/**
 * Stops timer and reset tray time to zeros
 */
const stopTimer = () => {
  if (timer) {
    timer.stop();
    if (!timer.isBreak) { recordCancelledTimer(); }
    resetTrayTime();
    timer = null;
  }
};


/**
 * Record cancelled timer for stats and re-reder tray menu to display new value
 */
const recordCancelledTimer = () => {
  cancelledAmount++;
  menuTemplate[cancelledMenuItemIndex].label = getCancelledLabel();
  renderMenu();
};


/**
 * Record finished timer for stats and re-reder tray menu to display new value
 */
const recordFinishedTimer = () => {
  finishedAmount++;
  menuTemplate[finishedMenuItemIndex].label = getFinishedLabel();
  renderMenu();
};

const recordBreak = () => {
  breaksAmount++;
  menuTemplate[breaksMenuItemIndex].label = getBreaksLabel();
  renderMenu();
};


/**
 * Returns string-message with amount of finished timers
 * @returns {String}
 */
function getFinishedLabel() { return `Finished: ${finishedAmount}`; }


/**
 * Returns string-message with amount of cancelled timers
 * @returns {String}
 */
function getCancelledLabel() { return `Cancelled: ${cancelledAmount}`; }

/**
 * Returns string-message with amount of finished break timers
 * @returns {String}
 */
function getBreaksLabel() { return `Breaks: ${breaksAmount}`; }





// UTILS

/**
 * Converts milliseconds to MM:SS format
 * @param {Number} ms milliseconds
 * @returns {Array} [MM, HH]
 */
const castToMMSS = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  let MM = String(Math.floor(seconds / 60));
  let SS = String(seconds % 60);
  if (MM.length === 1) { MM = `0${MM}`; }
  if (SS.length === 1) { SS = `0${SS}`; }
  return [MM, SS];
};
