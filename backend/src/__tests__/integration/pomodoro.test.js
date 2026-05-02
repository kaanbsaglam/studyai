/**
 * Pomodoro integration tests.
 *
 * Verifies controller passes user id to service and returns the whitelisted
 * fields only (no leaking of other DB columns).
 */

jest.mock('../../services/pomodoro.service', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

const request = require('supertest');
const pomodoroService = require('../../services/pomodoro.service');
const {
  getSettings,
  updateSettings,
} = require('../../controllers/pomodoro.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
} = require('../helpers/app');

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.get('/pomodoro/settings', getSettings);
    app.patch('/pomodoro/settings', updateSettings);
  });
}

const FULL = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLong: 4,
  soundEnabled: true,
  autoStartBreaks: false,
  // Extra fields the controller should NOT leak:
  id: 'internal-pk',
  userId: 'internal-user',
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('GET /pomodoro/settings', () => {
  it('returns only whitelisted fields', async () => {
    pomodoroService.getSettings.mockResolvedValue(FULL);
    const res = await request(makeApp()).get('/pomodoro/settings');
    expect(res.status).toBe(200);
    expect(res.body.data.settings).toEqual({
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLong: 4,
      soundEnabled: true,
      autoStartBreaks: false,
    });
    expect(res.body.data.settings).not.toHaveProperty('id');
    expect(res.body.data.settings).not.toHaveProperty('userId');
    expect(pomodoroService.getSettings).toHaveBeenCalledWith(FREE_USER.id);
  });
});

describe('PATCH /pomodoro/settings', () => {
  it('updates and returns whitelisted fields', async () => {
    pomodoroService.updateSettings.mockResolvedValue({ ...FULL, focusDuration: 30 });
    const res = await request(makeApp())
      .patch('/pomodoro/settings')
      .send({ focusDuration: 30 });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.focusDuration).toBe(30);
    expect(pomodoroService.updateSettings).toHaveBeenCalledWith(FREE_USER.id, { focusDuration: 30 });
  });

  it('rejects invalid input shape (Zod)', async () => {
    const res = await request(makeApp())
      .patch('/pomodoro/settings')
      .send({ focusDuration: -5 });
    expect(res.status).toBe(400);
    expect(pomodoroService.updateSettings).not.toHaveBeenCalled();
  });
});
