import './style.css';
import ruLocale from './locales/ru.json';
import enLocale from './locales/en.json';

const locales = {
    ru: ruLocale,
    en: enLocale,
};

const registerOverlay = document.getElementById('register-overlay');
const overlayProgress = document.getElementById('overlay-progress');
const accountStatusText = document.getElementById('account-status-text');
const accountRegisterBtn = document.getElementById('account-register-btn');
const accountForgetBtn = document.getElementById('account-forget-btn');

const scanBtn = document.getElementById('scan-btn');
const stopBtn = document.getElementById('stop-btn');
const resultsHead = document.getElementById('results-head');
const resultsBody = document.getElementById('results-body');
const statusText = document.getElementById('status-text');
const protocolSelect = document.getElementById('protocol-select');
const presetSelect = document.getElementById('preset-select');
const contextMenu = document.getElementById('context-menu');

const advancedToggle = document.getElementById('advanced-toggle');
const advancedPanel = document.getElementById('advanced-panel');
const advCustomTarget = document.getElementById('adv-custom-target');
const advPort = document.getElementById('adv-port');
const advSweepPorts = document.getElementById('adv-sweep-ports');
const advMtu = document.getElementById('adv-mtu');
const advDns = document.getElementById('adv-dns');
const advBestBy = document.getElementById('adv-best-by');
const advPingTarget = document.getElementById('adv-ping-target');
const advTunPingCount = document.getElementById('adv-tun-ping-count');
const advSpeedTest = document.getElementById('adv-speed-test');
const advAwgJc = document.getElementById('adv-awg-jc');
const advAwgJmin = document.getElementById('adv-awg-jmin');
const advAwgJmax = document.getElementById('adv-awg-jmax');
const advAwgI1 = document.getElementById('adv-awg-i1');
const advI1Host = document.getElementById('adv-i1-host');
const genI1Btn = document.getElementById('gen-i1-btn');
const advMasqueSni = document.getElementById('adv-masque-sni');
const advThroughEndpoint = document.getElementById('adv-through-endpoint');
const advInnerProtocol = document.getElementById('adv-inner-protocol');

const excludeNodeInput = document.getElementById('exclude-node');
const excludeCountryInput = document.getElementById('exclude-country');
const includeNodeInput = document.getElementById('include-node');
const includeCountryInput = document.getElementById('include-country');

const formatSelect = document.getElementById('format-select');
const saveBestBtn = document.getElementById('save-best-btn');
const saveSelectedBtn = document.getElementById('save-selected-btn');
const saveReportBtn = document.getElementById('save-report-btn');

const tgCheck = document.getElementById('tg-check');
const tgOnlyCheck = document.getElementById('tg-only-check');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const findJunkBtn = document.getElementById('find-junk-btn');
const findJunkStopBtn = document.getElementById('find-junk-stop-btn');
const findJunkLastBtn = document.getElementById('find-junk-last-btn');
const junkProgress = document.getElementById('junk-progress');
const junkProgressText = document.getElementById('junk-progress-text');
const junkResult = document.getElementById('junk-result');
const junkBest = document.getElementById('junk-best');
const junkAttemptsBody = document.getElementById('junk-attempts-body');
const junkApplyBtn = document.getElementById('junk-apply-btn');

const sniProtocol = document.getElementById('sni-protocol');
const findSniBtn = document.getElementById('find-sni-btn');
const findSniStopBtn = document.getElementById('find-sni-stop-btn');
const findSniLastBtn = document.getElementById('find-sni-last-btn');
const sniProgress = document.getElementById('sni-progress');
const sniProgressText = document.getElementById('sni-progress-text');
const sniResult = document.getElementById('sni-result');
const sniBest = document.getElementById('sni-best');
const sniAttemptsBody = document.getElementById('sni-attempts-body');
const sniApplyBtn = document.getElementById('sni-apply-btn');

const socksEndpoint = document.getElementById('socks-endpoint');
const socksPort = document.getElementById('socks-port');
const socksProtocol = document.getElementById('socks-protocol');
const socksStartBtn = document.getElementById('socks-start-btn');
const socksStopBtn = document.getElementById('socks-stop-btn');
const socksStatus = document.getElementById('socks-status');
const socksStatusText = document.getElementById('socks-status-text');

const historyList = document.getElementById('history-list');
const historyRefreshBtn = document.getElementById('history-refresh-btn');

const settingsSaveBtn = document.getElementById('settings-save-btn');
const settingsResetBtn = document.getElementById('settings-reset-btn');
const settingsStatus = document.getElementById('settings-status');
const settingsExportBtn = document.getElementById('settings-export-btn');
const settingsImportBtn = document.getElementById('settings-import-btn');
const setTheme = document.getElementById('set-theme');
const setLanguage = document.getElementById('set-language');

const updateIndicator = document.getElementById('update-indicator');
const currentVersion = document.getElementById('current-version');
const updateLatestRow = document.getElementById('update-latest-row');
const latestVersion = document.getElementById('latest-version');
const updateStatusText = document.getElementById('update-status-text');
const checkUpdatesBtn = document.getElementById('check-updates-btn');
const downloadUpdateBtn = document.getElementById('download-update-btn');

let foundEndpoints = []; // накапливаем найденные эндпоинты по мере поступления
let scanCancelled = false;
let selectedIndex = -1;
let userSettings = null; // глобальная переменная
let sortKey = '';
let sortDir = 'asc'; // 'asc' или 'desc'
let updateInfo = null;
let currentSniProfile = null;
let currentLocale = {};
let contextMenuEndpoint = null;

// Логика связи чекбоксов Telegram
if (tgCheck && tgOnlyCheck) {
    tgCheck.addEventListener('change', () => {
        if (tgCheck.checked) {
            tgOnlyCheck.disabled = false; // Включаем возможность клика
        } else {
            tgOnlyCheck.checked = false;  // Снимаем галочку
            tgOnlyCheck.disabled = true;  // Блокируем обратно
        }
    });
}

// Подписываемся на события прогресса из Go
if (window.runtime && window.runtime.EventsOn) {
    window.runtime.EventsOn('progress', (event) => {
        handleProgress(event);
    });
} else {
    console.warn('runtime.EventsOn недоступен — прогресс работать не будет');
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.go.main.App.CancelScan();
    } catch (e) {}

    await loadUserSettings();

    const lang = userSettings?.language || 'ru';
    const theme = userSettings?.theme || 'system';
    await applyLanguage(lang);
    applyTheme(theme);

    // Проверяем аккаунт
    let hasAccount = false;
    try {
        hasAccount = await window.go.main.App.HasAccount();
    } catch (err) {
        console.error('HasAccount failed:', err);
    }

    if (hasAccount) {
        statusText.textContent = t('status.accountLoaded');
    } else {
        // Первый запуск — авторегистрация
        statusText.textContent = t('status.registering');
        await autoRegister();
    }

    // Проверяем обновления при старте
    checkForUpdates();
});

async function autoRegister() {
    registerOverlay.style.display = 'flex';
    overlayProgress.textContent = '';

    try {
        await window.go.main.App.RegisterAccount();
        registerOverlay.style.display = 'none';
        statusText.textContent = t('status.registered');
        updateAccountStatus(true);
    } catch (err) {
        registerOverlay.style.display = 'none';
        console.error(err);
        statusText.textContent = t('status.autoRegisterFailed');
        updateAccountStatus(false);
    }
}

function updateAccountStatus(hasAccount) {
    if (!accountStatusText) return;
    if (hasAccount) {
        accountStatusText.textContent = t('tools.accountStatusLoaded');
        accountStatusText.className = 'account-status ok';
    } else {
        accountStatusText.textContent = t('tools.accountStatusMissing');
        accountStatusText.className = 'account-status error';
    }
}

if (accountRegisterBtn) {
    accountRegisterBtn.addEventListener('click', async () => {
        if (!confirm(t('tools.accountConfirmReregister'))) return;

        accountRegisterBtn.disabled = true;
        try {
            await window.go.main.App.ForgetAccount();
            registerOverlay.style.display = 'flex';
            overlayProgress.textContent = '';
            await window.go.main.App.RegisterAccount();
            registerOverlay.style.display = 'none';
            statusText.textContent = t('status.registered');
            updateAccountStatus(true);
        } catch (err) {
            registerOverlay.style.display = 'none';
            console.error(err);
            statusText.textContent = t('status.registerError', { msg: err });
            updateAccountStatus(false);
        } finally {
            accountRegisterBtn.disabled = false;
        }
    });
}

if (accountForgetBtn) {
    accountForgetBtn.addEventListener('click', async () => {
        if (!confirm(t('tools.accountConfirmForget'))) return;

        accountForgetBtn.disabled = true;
        try {
            await window.go.main.App.ForgetAccount();
            statusText.textContent = t('status.accountForgotten');
            updateAccountStatus(false);
        } catch (err) {
            console.error(err);
            statusText.textContent = t('status.error', { msg: err });
        } finally {
            accountForgetBtn.disabled = false;
        }
    });
}

scanBtn.addEventListener('click', async () => {
    scanCancelled = false;
    scanBtn.disabled = true;
    stopBtn.disabled = false;

    statusText.textContent = t('status.scanning');
    resultsHead.innerHTML = '';
    resultsBody.innerHTML = `<tr class="empty-row"><td colspan="1">${t('status.scanning')}</td></tr>`;
    selectedIndex = -1;
    saveSelectedBtn.disabled = true;

    // Сбрасываем сортировку
    sortKey = '';
    sortDir = 'asc';

    const preset = applyPreset(presetSelect.value);
    const advanced = advancedToggle.checked;
    const config = {
        protocol: protocolSelect.value,
        checkTG: tgCheck.checked,
        tgOnly: tgOnlyCheck.checked,
        excludeNodes: excludeNodeInput.value.trim(),
        excludeCountry: excludeCountryInput.value.trim(),
        includeNodes: includeNodeInput.value.trim(),
        includeCountry: includeCountryInput.value.trim(),
        samplePerSubnet: preset.samplePerSubnet,
        timeoutSec: preset.timeoutSec,
        tunnelPingCount: advanced && advTunPingCount.value
            ? parseInt(advTunPingCount.value)
            : preset.tunnelPingCount,
        full: preset.full,
        customTarget: advanced ? advCustomTarget.value.trim() : '',
        port: (advanced && advPort.value && !advSweepPorts.value) ? parseInt(advPort.value) : 0,
        sweepPorts: advanced ? advSweepPorts.value : '',
        mtu: advanced && advMtu.value ? parseInt(advMtu.value) : 0,
        dns: advanced ? advDns.value.trim() : '',
        speedTest: advanced ? advSpeedTest.checked : false,
        bestBy: advanced ? advBestBy.value : '',
        pingTarget: advanced ? advPingTarget.value.trim() : '',
        awgJunkCount: advanced && advAwgJc.value ? parseInt(advAwgJc.value) : 0,
        awgJunkMin: advanced && advAwgJmin.value ? parseInt(advAwgJmin.value) : 0,
        awgJunkMax: advanced && advAwgJmax.value ? parseInt(advAwgJmax.value) : 0,
        awgI1: advanced ? advAwgI1.value.trim() : '',
        masqueSni: advanced ? advMasqueSni.value.trim() : '',
        throughEndpoint: advanced ? advThroughEndpoint.value.trim() : '',
        innerProtocol: advanced ? advInnerProtocol.value : '',
    };

    try {
        foundEndpoints = [];
        resultsBody.innerHTML = `<tr class="empty-row"><td colspan="1">${t('status.scanning')}</td></tr>`;

        console.log('Scan config:', config);
        const result = await window.go.main.App.StartScan(config);
        console.log('Результат из Go:', result);

        // Если пользователь нажал «Стоп» — показываем сообщение об отмене
        if (scanCancelled) {
            statusText.textContent = t('status.stopped');
            resultsHead.innerHTML = '';
            resultsBody.innerHTML = `<tr class="empty-row"><td colspan="1">${t('status.scanStoppedEmpty')}</td></tr>`;
            foundEndpoints = [];
            selectedIndex = -1;
            saveSelectedBtn.disabled = true;
            return;
        }

        // Иначе — рендерим результаты как обычно
        foundEndpoints = result.results || [];
        renderResults(foundEndpoints);
        statusText.textContent = t('status.found', { n: foundEndpoints.length });
    } catch (err) {
        const msg = String(err);
        if (msg.includes('canceled')) {
            statusText.textContent = t('status.stopped');
            resultsHead.innerHTML = '';
            resultsBody.innerHTML = `<tr class="empty-row"><td colspan="1">${t('status.scanStoppedEmpty')}</td></tr>`;
            foundEndpoints = [];
            selectedIndex = -1;
            saveSelectedBtn.disabled = true;
        } else {
            console.error(err);
            statusText.textContent = t('status.error', { msg: err });
        }
    } finally {
        scanBtn.disabled = false;
        stopBtn.disabled = true;
    }
});

stopBtn.addEventListener('click', async () => {
    scanCancelled = true;
    statusText.textContent = t('status.stopping');
    stopBtn.disabled = true;

    try {
        await window.go.main.App.CancelScan();
    } catch (err) {
        console.error(err);
    }
});

advancedToggle.addEventListener('change', () => {
    advancedPanel.style.display = advancedToggle.checked ? 'block' : 'none';
});

async function saveConfigFor(endpoint) {
    const format = formatSelect.value;
    statusText.textContent = t('status.generatingConfig');

    try {
        const content = await window.go.main.App.RenderConfigForEndpoint(endpoint, format);
        if (!content) {
            statusText.textContent = t('status.configFailed');
            return;
        }

        const ext = format === 'mihomo' ? 'yaml' : (format === 'usque' ? 'json' : 'conf');
        const defaultName = `warp-${format}.${ext}`;
        const savedPath = await window.go.main.App.SaveFile(content, defaultName);

        if (savedPath) {
            statusText.textContent = t('status.saved', { path: savedPath });
        } else {
            statusText.textContent = t('status.saveCancelled');
        }
    } catch (err) {
        console.error(err);
        statusText.textContent = t('status.error', { msg: err });
    }
}

saveBestBtn.addEventListener('click', async () => {
    if (!foundEndpoints || foundEndpoints.length === 0) {
        statusText.textContent = t('status.scanFirst');
        return;
    }
    saveBestBtn.disabled = true;
    await saveConfigFor(foundEndpoints[0]);
    saveBestBtn.disabled = false;
});

saveSelectedBtn.addEventListener('click', async () => {
    if (selectedIndex < 0 || selectedIndex >= foundEndpoints.length) {
        statusText.textContent = t('status.selectEndpoint');
        return;
    }
    saveSelectedBtn.disabled = true;
    await saveConfigFor(foundEndpoints[selectedIndex]);
    saveSelectedBtn.disabled = false;
});

function renderResults(endpoints) {
    resultsHead.innerHTML = '';
    resultsBody.innerHTML = '';

    if (!endpoints || endpoints.length === 0) {
        resultsBody.innerHTML = `<tr class="empty-row"><td colspan="1">${t('table.empty')}</td></tr>`;
        return;
    }

    // Определяем, какие колонки показывать
    const hasTunnelPing = endpoints.some(ep => ep.tunnelPingMs != null && ep.tunnelPingMs > 0);
    const hasLoss = endpoints.some(ep => ep.lossPercent != null && ep.lossPercent > 0);
    const hasSpeed = endpoints.some(ep => ep.speedMbps != null && ep.speedMbps > 0);
    const hasRegion = endpoints.some(ep => ep.region);
    const hasNode = endpoints.some(ep => ep.node);
    const hasLocation = endpoints.some(ep => ep.nodeLocation);
    const hasTG = endpoints.some(ep => ep.telegram_status);

    const columns = [
        { key: 'endpoint',   label: t('table.endpoint'),   always: true },
        { key: 'ping',       label: t('table.ping'),       always: true },
        { key: 'tunnelPing', label: t('table.tunnelPing'), show: hasTunnelPing },
        { key: 'loss',       label: t('table.loss'),       show: hasLoss },
        { key: 'speed',      label: t('table.speed'),      show: hasSpeed },
        { key: 'tg', label: 'TG', show: hasTG },
        { key: 'region',     label: t('table.region'),     show: hasRegion },
        { key: 'node',       label: t('table.node'),       show: hasNode },
        { key: 'location',   label: t('table.location'),   show: hasLocation },
    ];

    const visibleColumns = columns.filter(c => c.always || c.show);

    // Заголовок со стрелкой сортировки
    resultsHead.innerHTML = '<tr>' +
        visibleColumns.map(c => {
            const arrow = (sortKey === c.key)
                ? (sortDir === 'asc' ? ' ▲' : ' ▼')
                : '';
            return `<th data-key="${c.key}" class="sortable">${c.label}${arrow}</th>`;
        }).join('') +
        '</tr>';

    // Обработчики клика на заголовки
    resultsHead.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (sortKey === key) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDir = (key === 'speed' || key === 'tg') ? 'desc' : 'asc';
            }
            renderResults(endpoints);
        });
    });

    // Сортируем, если выбрано поле
    const sorted = [...endpoints];
    if (sortKey) {
        sorted.sort((a, b) => {
            if (sortKey === 'tg') {
                const getWeight = (status) => {
                    if (status === 'ok') return 3;
                    if (status === '3/5') return 2;
                    if (status === '1/5') return 1;
                    if (status === 'blocked') return 0;
                    return -1; // Пустой статус
                };
                const wA = getWeight(a.telegram_status);
                const wB = getWeight(b.telegram_status);

                // 1. Статусы ВСЕГДА идут в фиксированном порядке (ok -> 3/5 -> 1/5 -> blocked).
                // Стрелка asc/desc на это не влияет.
                if (wA !== wB) {
                    return wB - wA; 
                }

                // 2. Если статусы одинаковые, сортируем по пингу (с учетом направления стрелки)
                if (wA >= 0) {
                    // Принудительно приводим к числу на случай, если пришла строка или null
                    const pA = parseInt(a.telegram_ping, 10) || 999999;
                    const pB = parseInt(b.telegram_ping, 10) || 999999;
                    if (pA !== pB) {
                        return sortDir === 'asc' ? (pA - pB) : (pB - pA);
                    }
                }
                return 0;
            }

            // Стандартная сортировка для всех остальных колонок
            const av = getSortValue(a, sortKey);
            const bv = getSortValue(b, sortKey);
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const ms = t('table.ms');
    const mbps = t('table.mbps');
    const percent = t('table.percent');

    sorted.forEach((ep) => {
        const row = document.createElement('tr');
        const originalIndex = foundEndpoints.indexOf(ep);
        row.dataset.index = originalIndex;

        if (originalIndex === selectedIndex) {
            row.classList.add('selected');
        }

        const cells = visibleColumns.map(c => {
            switch (c.key) {
                case 'endpoint':   return `<td>${ep.endpoint}</td>`;
                case 'ping':
                    if (!ep.endpointPingMs) return `<td>—</td>`;
                    const p = ep.endpointPingMs;
                    let pColor = '#f44336'; // Красный по умолчанию (для плохих)
                    if (p < 50) {
                        pColor = '#4caf50'; // Зеленый
                    } else if (p < 150) {
                        pColor = '#ff9800'; // Оранжевый
                    }                    
                    return `<td style="color: ${pColor}; font-weight: 500;">${p.toFixed(0)} ${ms}</td>`;
                case 'tunnelPing': return `<td>${ep.tunnelPingMs ? ep.tunnelPingMs.toFixed(0) + ' ' + ms : '—'}</td>`;
                case 'loss':       return `<td>${ep.lossPercent ? ep.lossPercent.toFixed(0) + percent : '—'}</td>`;
                case 'speed':      return `<td>${ep.speedMbps ? ep.speedMbps.toFixed(1) + ' ' + mbps : '—'}</td>`;
                case 'tg':
                    if (ep.telegram_status === 'ok') {
                        return `<td style="color: #4caf50;">ok (${ep.telegram_ping}ms)</td>`;
                    } else if (ep.telegram_status === 'blocked') {
                        return `<td style="color: #f44336;">${ep.telegram_status}</td>`;
                    } else if (ep.telegram_status) {
                        // Для вариантов вида 1/5, 3/5, 4/5
                        return `<td style="color: #ff9800;">${ep.telegram_status}</td>`;
                    }
                    return `<td>—</td>`;
                case 'region':     return `<td>${ep.region || '—'}</td>`;
                case 'node':       return `<td>${ep.node || '—'}</td>`;
                case 'location':   return `<td>${ep.nodeLocation || '—'}</td>`;
                default:           return '<td>—</td>';
            }
        }).join('');

        row.innerHTML = cells;

        row.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Выделяем строку, чтобы визуально было понятно, к чему относится меню
            selectRow(originalIndex, row);

            // Запоминаем эндпоинт
            contextMenuEndpoint = ep;

            // Показываем меню в позиции курсора
            contextMenu.style.display = 'flex';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';

            // Проверяем, не выходит ли меню за границы окна
            const rect = contextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                contextMenu.style.left = (e.pageX - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                contextMenu.style.top = (e.pageY - rect.height) + 'px';
            }
        });

        row.addEventListener('click', () => selectRow(originalIndex, row));
        resultsBody.appendChild(row);
    });
}

// Преобразует поле эндпоинта в значение для сортировки
function getSortValue(ep, key) {
    switch (key) {
        case 'endpoint':   return ep.endpoint || '';
        case 'ping':       return ep.endpointPingMs ?? Infinity;
        case 'tunnelPing': return ep.tunnelPingMs ?? Infinity;
        case 'loss':       return ep.lossPercent ?? Infinity;
        case 'speed':      return ep.speedMbps ?? -Infinity; // скорость: больше = лучше
        case 'tg':         return ep.telegram_status || '';
        case 'region':     return ep.region || '';
        case 'node':       return ep.node || '';
        case 'location':   return ep.nodeLocation || '';
        default:           return '';
    }
}

function selectRow(index, row) {
    document.querySelectorAll('#results-body tr').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    selectedIndex = index;
    saveSelectedBtn.disabled = false;

    statusText.textContent = t('status.selected', { value: foundEndpoints[index].endpoint });
}

function handleProgress(event) {
    if (!event) return;

    if (event.operation === 'register') {
        if (event.message) {
            overlayProgress.textContent = event.message;
        } else if (event.phase) {
            overlayProgress.textContent = event.phase;
        }
        return;
    }

    if (event.type === 'progress') {
        if (event.total > 0) {
            statusText.textContent = `${event.phase || t('status.scanning')}: ${event.completed ?? 0}/${event.total ?? 0}`;
        } else if (event.message) {
            statusText.textContent = `${event.phase || t('status.scanning')}: ${event.message}`;
        } else if (event.phase) {
            statusText.textContent = event.phase;
        }
    }

    if (event.type === 'phase-completed') {
        statusText.textContent = t('status.finishing');
    }

    if (event.operation === 'find-junk') {
        junkProgressText.textContent = event.message || t('status.searching');
        return;
    }

    if (event.operation === 'find-sni') {
        if (event.message) {
            sniProgressText.textContent = event.message;
        }
        return;
    }

    if (event.operation === 'socks') {
        if (event.message && event.message.startsWith('socks5h://')) {
            const addr = event.message.replace('socks5h://', '');
            const port = addr.split(':')[1] || '1080';

            socksStatusText.textContent = t('status.socksRunning', { addr: addr });

            document.getElementById('socks-port-hint').textContent = port;
            document.getElementById('socks-addr-h').textContent = `socks5h://${addr}`;
            document.getElementById('socks-addr').textContent = `socks5://${addr}`;
            document.getElementById('socks-hint').style.display = 'block';
        } else if (event.message) {
            socksStatusText.textContent = event.message;
        } else if (event.phase) {
            socksStatusText.textContent = event.phase;
        }
        return;
    }
}

async function loadUserSettings() {
    try {
        userSettings = await window.go.main.App.LoadSettings();
        console.log('userSettings loaded:', userSettings);
    } catch (err) {
        console.error('loadUserSettings failed:', err);
        userSettings = null;
    }
}

function applyPreset(preset) {
    const defaults = userSettings || {};

    switch (preset) {
        case 'standard':
            return {
                samplePerSubnet: defaults.defaultSamplePerSubnet || 5,
                timeoutSec: defaults.defaultTimeoutSec || 2,
                tunnelPingCount: 0,
                full: false,
            };
        case 'durable':
            return {
                samplePerSubnet: defaults.defaultSamplePerSubnet || 5,
                timeoutSec: defaults.defaultTimeoutSec || 3,
                tunnelPingCount: defaults.defaultTunnelPingCount || 10,
                full: false,
            };
        case 'full':
            return {
                samplePerSubnet: 0,
                timeoutSec: defaults.defaultTimeoutSec || 3,
                tunnelPingCount: defaults.defaultTunnelPingCount || 10,
                full: true,
            };
        default:
            return {
                samplePerSubnet: defaults.defaultSamplePerSubnet || 5,
                timeoutSec: defaults.defaultTimeoutSec || 2,
                tunnelPingCount: 0,
                full: false,
            };
    }
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;

        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${target}`).classList.add('active');
    });
});

findJunkBtn.addEventListener('click', async () => {
    findJunkBtn.disabled = true;
    findJunkLastBtn.disabled = true;
    findJunkStopBtn.disabled = false;

    junkProgress.style.display = 'block';
    junkResult.style.display = 'none';
    junkProgressText.textContent = t('tools.startingSearch');

    const config = {
        samplePerSubnet: 0,
        timeoutSec: 2,
        tunnelPingCount: 0,
    };

    try {
        const profile = await window.go.main.App.FindJunk(config);
        renderJunkResult(profile);

        try {
            await window.go.main.App.SaveLastJunk(profile);
        } catch (saveErr) {
            console.warn('Не удалось сохранить профиль junk:', saveErr);
        }

        junkProgress.style.display = 'none';
        junkResult.style.display = 'block';
    } catch (err) {
        const msg = String(err);
        if (msg.includes('canceled')) {
            junkProgressText.textContent = t('tools.searchStopped');
            setTimeout(() => {
                junkProgress.style.display = 'none';
            }, 1500);
        } else {
            console.error(err);
            junkProgressText.textContent = t('status.error', { msg: err });
        }
    } finally {
        findJunkBtn.disabled = false;
        findJunkLastBtn.disabled = false;
        findJunkStopBtn.disabled = true;
    }
});

findJunkStopBtn.addEventListener('click', async () => {
    junkProgressText.textContent = t('status.stopping');
    try {
        await window.go.main.App.CancelScan();
    } catch (err) {
        console.error(err);
    }
});

// Кнопка «Последний поиск»
findJunkLastBtn.addEventListener('click', async () => {
    junkProgress.style.display = 'block';
    junkResult.style.display = 'none';
    junkProgressText.textContent = t('tools.loadingLast');

    try {
        const profile = await window.go.main.App.LoadLastJunk();
        junkProgress.style.display = 'none';
        junkResult.style.display = 'block';
        renderJunkResult(profile);
    } catch (err) {
        console.error(err);
        junkProgressText.textContent = t('tools.noSavedSearch');
    }
});

let currentJunkProfile = null;
function renderJunkResult(profile) {
    currentJunkProfile = profile;
    // Лучший набор
    junkBest.textContent = `jc=${profile.junkCount} jmin=${profile.junkMin} jmax=${profile.junkMax}` +
        (profile.i1 ? `\ni1=${profile.i1}` : '');

    // Попытки
    junkAttemptsBody.innerHTML = '';
    const tested = profile.tested || [];
    if (tested.length === 0) {
        junkAttemptsBody.innerHTML = `<tr><td colspan="5">${t('tools.noAttempts')}</td></tr>`;
        return;
    }

    tested.forEach((attempt, index) => {
        const row = document.createElement('tr');
        if (attempt.selected) row.classList.add('selected');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${attempt.junkCount}</td>
            <td>${attempt.junkMin}</td>
            <td>${attempt.junkMax}</td>
            <td>${attempt.working} / ${attempt.total}</td>
        `;
        junkAttemptsBody.appendChild(row);
    });
}

junkApplyBtn.addEventListener('click', () => {
    const profile = currentJunkProfile;
    if (!profile) {
        statusText.textContent = t('status.noResult');
        return;
    }

    if (!advancedToggle.checked) {
        advancedToggle.checked = true;
        advancedPanel.style.display = 'block';
    }

    advAwgJc.value = profile.junkCount || '';
    advAwgJmin.value = profile.junkMin || '';
    advAwgJmax.value = profile.junkMax || '';
    advAwgI1.value = profile.i1 || '';

    document.querySelector('.tab-btn[data-tab="scan"]').click();

    statusText.textContent = t('status.junkApplied');
});

socksStartBtn.addEventListener('click', async () => {
    const endpoint = socksEndpoint.value.trim();
    const port = parseInt(socksPort.value);
    const protocol = socksProtocol.value;

    if (!endpoint) {
        socksStatus.style.display = 'block';
        socksStatusText.textContent = t('tools.specifyEndpoint');
        return;
    }

    socksStartBtn.disabled = true;
    socksStopBtn.disabled = false;
    socksStatus.style.display = 'block';
    socksStatusText.textContent = t('tools.startingSocks');

    try {
        await window.go.main.App.StartSocks(endpoint, port, protocol);
        socksStatusText.textContent = t('tools.socksWorks', { port: port });
    } catch (err) {
        console.error(err);
        socksStatusText.textContent = t('status.error', { msg: err });
        socksStartBtn.disabled = false;
        socksStopBtn.disabled = true;
    }
});

socksStopBtn.addEventListener('click', async () => {
    await window.go.main.App.StopSocks();
    socksStartBtn.disabled = false;
    socksStopBtn.disabled = true;
    socksStatusText.textContent = t('tools.stopped');
});

window.runtime.EventsOn('socks-error', (msg) => {
    socksStatusText.textContent = t('status.error', { msg: msg });
    socksStartBtn.disabled = false;
    socksStopBtn.disabled = true;
});

window.runtime.EventsOn('socks-stopped', () => {
    socksStatusText.textContent = t('tools.stopped');
    document.getElementById('socks-hint').style.display = 'none';
    socksStartBtn.disabled = false;
    socksStopBtn.disabled = true;
});

window.addEventListener('beforeunload', () => {
    if (window.go && window.go.main && window.go.main.App) {
        window.go.main.App.StopSocks();
    }
});

// Реакция на смену темы системы
if (window.matchMedia) {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkQuery.addEventListener('change', () => {
        const currentPref = document.documentElement.getAttribute('data-theme-preference');
        if (currentPref === 'system') {
            applyTheme('system');
        }
    });
}

saveReportBtn.addEventListener('click', async () => {
    saveReportBtn.disabled = true;
    statusText.textContent = t('status.generatingReport');

    try {
        const content = await window.go.main.App.RenderReport();
        if (!content) {
            statusText.textContent = t('status.reportFailed');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const defaultName = `warpscout-report-${timestamp}.txt`;

        const savedPath = await window.go.main.App.SaveFile(content, defaultName);
        if (savedPath) {
            statusText.textContent = t('status.reportSaved', { path: savedPath });
        } else {
            statusText.textContent = t('status.saveCancelled');
        }
    } catch (err) {
        console.error(err);
        statusText.textContent = t('status.error', { msg: err });
    } finally {
        saveReportBtn.disabled = false;
    }
});

async function loadHistoryList() {
    historyList.innerHTML = `<div class="placeholder">${t('history.loading')}</div>`;

    try {
        const entries = await window.go.main.App.ListHistory();
        renderHistoryList(entries);
    } catch (err) {
        console.error(err);
        historyList.innerHTML = `<div class="placeholder">${t('status.loadError', { msg: err })}</div>`;
    }
}

function renderHistoryList(entries) {
    historyList.innerHTML = '';

    if (!entries || entries.length === 0) {
        historyList.innerHTML = `<div class="placeholder">${t('history.empty')}</div>`;
        return;
    }

    for (const entry of entries) {
        const item = document.createElement('div');
        item.className = 'history-item';

        const date = new Date(entry.savedAt).toLocaleString('ru-RU');
        const proto = (entry.config.protocol || 'wg').toUpperCase();
        const preset = entry.config.full ? 'Full' : (entry.config.tunnelPingCount > 0 ? 'Durable' : 'Standard');

        item.innerHTML = `
            <div class="history-item-main">
                <div class="history-item-date">${date}</div>
                <div class="history-item-meta">${proto} · ${preset}</div>
            </div>
            <div class="history-item-actions">
                <button class="secondary-btn history-view-btn" data-id="${entry.id}">${t('history.open')}</button>
                <button class="secondary-btn history-apply-btn" data-id="${entry.id}" title="${t('history.apply')}">${t('history.apply')}</button>
                <button class="secondary-btn history-delete-btn" data-id="${entry.id}">${t('history.delete')}</button>
            </div>
        `;

        // Клик по item — открыть
        item.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return; // игнорируем клик по кнопкам
            viewHistoryEntry(entry.id);
        });

        historyList.appendChild(item);
    }

    // Обработчики кнопок
    historyList.querySelectorAll('.history-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewHistoryEntry(btn.dataset.id);
        });
    });

    historyList.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(t('history.confirmDelete'))) return;
            try {
                await window.go.main.App.DeleteHistory(btn.dataset.id);
                loadHistoryList();
            } catch (err) {
                console.error(err);
                alert(t('history.deleteError', { msg: err }));
            }
        });
    });

    historyList.querySelectorAll('.history-apply-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const entry = await window.go.main.App.LoadHistory(btn.dataset.id);
                applyHistoryConfig(entry.config);

                // Переключаемся на вкладку «Сканирование»
                document.querySelector('.tab-btn[data-tab="scan"]').click();

                statusText.textContent = t('status.historyApplied');
            } catch (err) {
                console.error(err);
                alert(t('history.applyError', { msg: err }));
            }
        });
    });
}

async function viewHistoryEntry(id) {
    try {
        const entry = await window.go.main.App.LoadHistory(id);
        console.log('History entry:', entry);

        // Переключаемся на вкладку «Сканирование»
        document.querySelector('.tab-btn[data-tab="scan"]').click();

        // Загружаем результаты в таблицу
        foundEndpoints = entry.report.results || [];
        renderResults(foundEndpoints);

        // Сбрасываем состояние выбора и сортировки
        selectedIndex = -1;
        saveSelectedBtn.disabled = true;
        sortKey = '';
        sortDir = 'asc';

        // Обновляем статус
        const date = new Date(entry.savedAt).toLocaleString();
        statusText.textContent = t('status.loadedFromHistory', { date: date, n: foundEndpoints.length });
    } catch (err) {
        console.error(err);
        alert(t('history.loadError', { msg: err }));
    }
}

// Кнопка «Обновить»
historyRefreshBtn.addEventListener('click', loadHistoryList);

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        if (btn.dataset.tab === 'history') {
            loadHistoryList();
        }
        if (btn.dataset.tab === 'settings') {
            loadSettings();
        }
        if (btn.dataset.tab === 'tools') {
            // Обновляем статус аккаунта
            try {
                const has = await window.go.main.App.HasAccount();
                updateAccountStatus(has);
            } catch (e) {}
        }
    });
});

function applyHistoryConfig(config) {
    // 1. Протокол
    protocolSelect.value = config.protocol || 'awg';

    // 2. Определяем пресет из конфига
    if (config.full) {
        presetSelect.value = 'full';
    } else if (config.tunnelPingCount > 0) {
        presetSelect.value = 'durable';
    } else {
        presetSelect.value = 'standard';
    }

    // 3. Фильтры
    excludeNodeInput.value = config.excludeNodes || '';
    excludeCountryInput.value = config.excludeCountry || '';
    includeNodeInput.value = config.includeNodes || '';
    includeCountryInput.value = config.includeCountry || '';

    // 4. Продвинутые параметры — включаем панель, если что-то заполнено
    console.log('applyHistoryConfig:', {
        throughEndpoint: config.throughEndpoint,
        sweepPorts: config.sweepPorts,
        hasAdvancedRaw: config.throughEndpoint || config.sweepPorts
    });

    const hasAdvanced =
        config.customTarget ||
        config.port > 0 ||
        config.mtu > 0 ||
        config.dns ||
        config.speedTest ||
        (config.bestBy && config.bestBy !== 'ping') ||
        config.pingTarget ||
        config.awgJunkCount > 0 ||
        config.awgJunkMin > 0 ||
        config.awgJunkMax > 0 ||
        config.awgI1 ||
        config.masqueSni ||
        config.sweepPorts ||
        config.throughEndpoint;

    if (hasAdvanced) {
        advancedToggle.checked = true;
        advancedPanel.style.display = 'block';
    } else {
        advancedToggle.checked = false;
        advancedPanel.style.display = 'none';
    }

    console.log('after hasAdvanced:', {
        hasAdvanced: hasAdvanced,
        checkbox: advancedToggle.checked,
        display: advancedPanel.style.display
    });

    // 5. Заполняем продвинутые поля
    advCustomTarget.value = config.customTarget || '';
    advPort.value = config.port || '';
    advSweepPorts.value = config.sweepPorts || '';
    advMtu.value = config.mtu || '';
    advDns.value = config.dns || '';
    advBestBy.value = config.bestBy || 'ping';
    advPingTarget.value = config.pingTarget || '';
    advTunPingCount.value = config.tunnelPingCount || '';
    advSpeedTest.checked = !!config.speedTest;
    advAwgJc.value = config.awgJunkCount || '';
    advAwgJmin.value = config.awgJunkMin || '';
    advAwgJmax.value = config.awgJunkMax || '';
    advAwgI1.value = config.awgI1 || '';
    advMasqueSni.value = config.masqueSni || '';
    advSweepPorts.value = config.sweepPorts || '';
    advThroughEndpoint.value = config.throughEndpoint || '';
    advInnerProtocol.value = config.innerProtocol || 'awg';
}

advSweepPorts.addEventListener('change', () => {
    if (advSweepPorts.value) {
        advPort.value = '';
    }
});

advPort.addEventListener('input', () => {
    if (advPort.value) {
        advSweepPorts.value = '';
    }
});

async function loadSettings() {
    try {
        const s = await window.go.main.App.LoadSettings();
        setTheme.value = s.theme || 'blacksoft';
        setLanguage.value = s.language || 'ru';
        applyTheme(s.theme || 'blacksoft');
        await applyLanguage(s.language || 'ru');
    } catch (err) {
        console.error('LoadSettings failed:', err);
    }
}

async function saveSettings() {
    const settings = {
        saveHistoryEnabled: true,   // Всегда включено
        historyLimit: 50,           // Дефолтный лимит
        theme: setTheme.value,
        language: setLanguage.value,
    };

    try {
        await window.go.main.App.SaveSettings(settings);
        settingsStatus.textContent = t('settings.saved');
        setTimeout(() => { settingsStatus.textContent = ''; }, 2000);
    } catch (err) {
        console.error(err);
        settingsStatus.textContent = t('status.error', { msg: err });
        settingsStatus.style.color = 'var(--danger)';
    }
}

settingsSaveBtn.addEventListener('click', saveSettings);

settingsResetBtn.addEventListener('click', async () => {
    setTheme.value = 'system';
    applyTheme('system'); 
    const sysLang = userSettings?.language || 'ru';
    setLanguage.value = sysLang;
    await applyLanguage(sysLang);
    await saveSettings();
});

function applyTheme(name) {
    if (!name) name = 'system';

    let resolved = name;
    if (name === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = prefersDark ? 'blacksoft' : 'light';
    }

    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-preference', name);
}

setTheme.addEventListener('change', () => {
    applyTheme(setTheme.value);
});

settingsExportBtn.addEventListener('click', async () => {
    try {
        const path = await window.go.main.App.ExportSettings();
        if (path) {
            settingsStatus.textContent = t('settings.exported', { path: path });
            settingsStatus.style.color = 'var(--success)';
            setTimeout(() => { settingsStatus.textContent = ''; }, 3000);
        } else {
            settingsStatus.textContent = t('settings.exportCancelled');
            settingsStatus.style.color = 'var(--text-dim)';
            setTimeout(() => { settingsStatus.textContent = ''; }, 2000);
        }
    } catch (err) {
        console.error(err);
        settingsStatus.textContent = t('status.error', { msg: err });
        settingsStatus.style.color = 'var(--danger)';
    }
});

settingsImportBtn.addEventListener('click', async () => {
    try {
        const s = await window.go.main.App.ImportSettings();

        // Если пользователь отменил — s будет пустой объект
        if (!s || Object.keys(s).length === 0) {
            settingsStatus.textContent = t('settings.importCancelled');
            settingsStatus.style.color = 'var(--text-dim)';
            setTimeout(() => { settingsStatus.textContent = ''; }, 2000);
            return;
        }

        setTheme.value = s.theme || 'blacksoft';
        applyTheme(s.theme || 'blacksoft');
        if (s.language) {
            setLanguage.value = s.language;
            await applyLanguage(s.language);
        }

        settingsStatus.textContent = t('settings.imported');
        settingsStatus.style.color = 'var(--success)';
        setTimeout(() => { settingsStatus.textContent = ''; }, 3000);
    } catch (err) {
        console.error(err);
        settingsStatus.textContent = t('status.error', { msg: err });
        settingsStatus.style.color = 'var(--danger)';
    }
});

async function checkForUpdates() {
    if (updateStatusText) {
        updateStatusText.textContent = t('settings.checking');
        updateStatusText.className = 'update-status';
    }

    try {
        const info = await window.go.main.App.CheckForUpdates();
        console.log('Update check:', info);
        handleUpdateInfo(info);
    } catch (err) {
        console.error('Update check failed:', err);
        if (updateStatusText) {
            updateStatusText.textContent = t('status.error', { msg: err });
            updateStatusText.className = 'update-status error';
        }
    }
}

// Клик по 🔔 в topbar — открываем настройки и скроллим к секции «Обновления»
if (updateIndicator) {
    updateIndicator.addEventListener('click', () => {
        // 1. Открываем вкладку «Настройки»
        document.querySelector('.tab-btn[data-tab="settings"]').click();

        // 2. Через небольшую задержку скроллим и подсвечиваем
        setTimeout(() => {
            const section = document.getElementById('updates-section');
            if (!section) return;

            // Скролл к секции
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Подсветка
            section.classList.add('updates-highlight');
            setTimeout(() => {
                section.classList.remove('updates-highlight');
            }, 2000);
        }, 150);
    });
}

// Кнопка «Проверить обновления»
if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
        checkUpdatesBtn.disabled = true;
        try {
            // Форсируем проверку — игнорируем кеш
            const info = await window.go.main.App.ForceCheckForUpdates();
            console.log('Forced update check:', info);
            // Обновляем UI
            handleUpdateInfo(info);
        } catch (err) {
            console.error(err);
        } finally {
            checkUpdatesBtn.disabled = false;
        }
    });
    }

// Кнопка «Скачать обновление»
if (downloadUpdateBtn) {
    downloadUpdateBtn.addEventListener('click', async () => {
        if (updateInfo && updateInfo.releaseUrl) {
            await window.go.main.App.OpenReleasePage(updateInfo.releaseUrl);
        }
    });
}

function handleUpdateInfo(info) {
    if (!info) return;
    updateInfo = info;

    if (currentVersion) {
        currentVersion.textContent = info.currentTag || '0.1.0';
    }

    if (info.available) {
        if (latestVersion) latestVersion.textContent = info.latestTag;
        if (updateLatestRow) updateLatestRow.style.display = 'flex';
        if (downloadUpdateBtn) downloadUpdateBtn.style.display = 'inline-block';

        // Скрываем строку статуса — информация уже показана выше
        const statusRow = document.getElementById('update-status-row');
        if (statusRow) statusRow.style.display = 'none';

        if (updateIndicator) updateIndicator.style.display = 'inline-flex';
    } else {
        if (updateLatestRow) updateLatestRow.style.display = 'none';
        if (downloadUpdateBtn) downloadUpdateBtn.style.display = 'none';

        if (updateStatusText) {
            if (info.error) {
                if (info.error.includes('rate limit')) {
                    updateStatusText.textContent = t('settings.rateLimit');
                } else if (info.error.includes('placeholder')) {
                    updateStatusText.textContent = t('settings.notConfigured');
                } else {
                    updateStatusText.textContent = t('settings.checkFailed');
                }
                updateStatusText.className = 'update-status error';
            } else {
                updateStatusText.textContent = t('settings.upToDate');
                updateStatusText.className = 'update-status success';
            }
        }

        if (updateIndicator) updateIndicator.style.display = 'none';
    }
}

findSniBtn.addEventListener('click', async () => {
    findSniBtn.disabled = true;
    findSniLastBtn.disabled = true;
    findSniStopBtn.disabled = false;

    sniProgress.style.display = 'block';
    sniResult.style.display = 'none';
    sniProgressText.textContent = t('tools.startingSearch');

    const protocol = sniProtocol.value;

    const config = {
        protocol: protocol,
        samplePerSubnet: 0,
        timeoutSec: 2,
        tunnelPingCount: 0,
    };

    try {
        const profile = await window.go.main.App.FindSNI(config);
        renderSniResult(profile);

        try {
            await window.go.main.App.SaveLastSNI(protocol, profile);
        } catch (saveErr) {
            console.warn('Не удалось сохранить профиль SNI:', saveErr);
        }

        sniProgress.style.display = 'none';
        sniResult.style.display = 'block';
    } catch (err) {
        const msg = String(err);
        if (msg.includes('canceled')) {
            sniProgressText.textContent = t('tools.searchStopped');
            setTimeout(() => { sniProgress.style.display = 'none'; }, 1500);
        } else {
            console.error(err);
            sniProgressText.textContent = 'Ошибка: ' + err;
        }
    } finally {
        findSniBtn.disabled = false;
        findSniLastBtn.disabled = false;
        findSniStopBtn.disabled = true;
    }
});

findSniStopBtn.addEventListener('click', async () => {
    sniProgressText.textContent = t('status.stopping');
    findSniStopBtn.disabled = true;
    try {
        await window.go.main.App.CancelScan();
    } catch (err) {
        console.error(err);
    }
});

findSniLastBtn.addEventListener('click', async () => {
    const protocol = sniProtocol.value;

    sniProgress.style.display = 'block';
    sniResult.style.display = 'none';
    sniProgressText.textContent = t('tools.loadingLastFor', { proto: protocol });

    try {
        const profile = await window.go.main.App.LoadLastSNI(protocol);
        sniProgress.style.display = 'none';
        sniResult.style.display = 'block';
        renderSniResult(profile);
    } catch (err) {
        console.error(err);
        sniProgressText.textContent = t('tools.noSavedSearchFor', { proto: protocol });
    }
});

sniApplyBtn.addEventListener('click', () => {
    if (!currentSniProfile) {
        statusText.textContent = t('status.noResult');
        return;
    }

    // Включаем продвинутую панель, если закрыта
    if (!advancedToggle.checked) {
        advancedToggle.checked = true;
        advancedPanel.style.display = 'block';
    }

    // Заполняем поле MASQUE SNI
    advMasqueSni.value = currentSniProfile.sni || '';

    // Переключаемся на вкладку «Сканирование»
    document.querySelector('.tab-btn[data-tab="scan"]').click();

    statusText.textContent = t('status.sniApplied');
});

function renderSniResult(profile) {
    currentSniProfile = profile;

    // Лучший SNI
    sniBest.textContent = profile.sni || t('tools.notFound');

    // Попытки
    sniAttemptsBody.innerHTML = '';
    const tested = profile.tested || [];
    if (tested.length === 0) {
        sniAttemptsBody.innerHTML = `<tr><td colspan="3">${t('tools.noAttempts')}</td></tr>`;
        return;
    }

    tested.forEach((attempt, index) => {
        const row = document.createElement('tr');
        if (attempt.selected) row.classList.add('selected');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${attempt.sni}</td>
            <td>${attempt.working} / ${attempt.total}</td>
        `;
        sniAttemptsBody.appendChild(row);
    });
}

sniProtocol.addEventListener('change', () => {
    sniResult.style.display = 'none';
    sniProgress.style.display = 'none';
});

genI1Btn.addEventListener('click', async () => {
    const host = advI1Host.value.trim();
    if (!host) {
        statusText.textContent = t('status.specifyI1Domain');
        return;
    }

    genI1Btn.disabled = true;
    statusText.textContent = t('status.generatingI1');

    try {
        const i1 = await window.go.main.App.GenerateI1(host);
        advAwgI1.value = i1;
        statusText.textContent = t('status.i1Generated', { host: host });
    } catch (err) {
        console.error(err);
        statusText.textContent = t('status.error', { msg: err });
    } finally {
        genI1Btn.disabled = false;
    }
});

async function applyLanguage(lang) {
    currentLocale = locales[lang] || locales.ru || {};

    // Заменяем все элементы с data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const text = getNestedValue(currentLocale, key);
        if (text) el.innerHTML = text;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const text = getNestedValue(currentLocale, key);
        if (text) el.placeholder = text;
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        const text = getNestedValue(currentLocale, key);
        if (text) el.title = text;
    });
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function t(key, vars = {}) {
    let text = getNestedValue(currentLocale, key) || key;
    for (const [k, v] of Object.entries(vars)) {
        text = text.replaceAll(`{${k}}`, v);
    }
    return text;
}

setLanguage.addEventListener('change', async () => {
    await applyLanguage(setLanguage.value);
    // Перерисовываем таблицу с новыми заголовками
    if (foundEndpoints && foundEndpoints.length > 0) {
        renderResults(foundEndpoints);
    }
});

// Скрываем меню при клике вне его
document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
    }
});

// Скрываем при скролле и ресайзе
window.addEventListener('scroll', () => {
    contextMenu.style.display = 'none';
}, true);
window.addEventListener('resize', () => {
    contextMenu.style.display = 'none';
});

// Скрываем по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        contextMenu.style.display = 'none';
    }
});

// Обработчики пунктов меню
contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = item.dataset.action;

        if (!contextMenuEndpoint) {
            contextMenu.style.display = 'none';
            return;
        }

        const ep = contextMenuEndpoint;
        contextMenu.style.display = 'none';

        switch (action) {
            case 'copy':
                try {
                    await window.go.main.App.CopyToClipboard(ep.endpoint);
                    statusText.textContent = t('status.copied', { value: ep.endpoint });
                    setTimeout(() => {
                        if (statusText.textContent.startsWith(t('status.copiedPrefix'))) {
                            statusText.textContent = t('status.selected', { value: ep.endpoint });
                        }
                    }, 1500);
                } catch (err) {
                    console.error(err);
                    statusText.textContent = t('status.copyFailed');
                }
                break;

            case 'save':
                await saveConfigFor(ep);
                break;

            case 'socks':
                // Переключаемся на «Инструменты»
                document.querySelector('.tab-btn[data-tab="tools"]').click();
                // Заполняем поле эндпоинта
                socksEndpoint.value = ep.endpoint;
                // Скроллим к карточке SOCKS
                setTimeout(() => {
                    socksEndpoint.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    socksEndpoint.focus();
                }, 150);
                statusText.textContent = t('status.socksEndpointFilled', { value: ep.endpoint });
                break;

            case 'through':
                // Включаем продвинутую панель, если закрыта
                if (!advancedToggle.checked) {
                    advancedToggle.checked = true;
                    advancedPanel.style.display = 'block';
                }
                // Заполняем поле through-endpoint
                advThroughEndpoint.value = ep.endpoint;
                // Переключаемся на «Сканирование»
                document.querySelector('.tab-btn[data-tab="scan"]').click();
                statusText.textContent = t('status.throughEndpointFilled', { value: ep.endpoint });
                break;
        }
    });
});