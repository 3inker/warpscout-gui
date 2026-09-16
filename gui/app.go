package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "path/filepath"
    "sort"
    "strconv"
    "strings"
    "sync"
    "time"

    "github.com/vernette/warpscout/core"
    "github.com/vernette/warpscout/pkg/warpscout"
    "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
    ctx         context.Context
    engine      *core.Engine
    socksEngine *core.Engine
    mu          sync.Mutex
    account     core.Account
    lastReport   core.ScanReport
    accountPath string
}

type ScanConfig struct {
    Protocol        string `json:"protocol"`
    CheckTG         bool   `json:"checkTG"`
    TGOnly          bool   `json:"tgOnly"`
    ExcludeNodes    string `json:"excludeNodes"`
    ExcludeCountry  string `json:"excludeCountry"`
    IncludeNodes    string `json:"includeNodes"`
    IncludeCountry  string `json:"includeCountry"`
    SamplePerSubnet int    `json:"samplePerSubnet"`
    TimeoutSec      int    `json:"timeoutSec"`
    TunnelPingCount int    `json:"tunnelPingCount"`
    Full            bool   `json:"full"`
    CustomTarget    string `json:"customTarget"`
    Port            int    `json:"port"`
    SweepPorts string `json:"sweepPorts"`
    MTU             int    `json:"mtu"`
    DNS             string `json:"dns"`
    SpeedTest       bool   `json:"speedTest"`
    BestBy          string `json:"bestBy"`
    PingTarget      string `json:"pingTarget"`
    AWGJunkCount int    `json:"awgJunkCount"`
    AWGJunkMin   int    `json:"awgJunkMin"`
    AWGJunkMax   int    `json:"awgJunkMax"`
    AWGI1        string `json:"awgI1"`
    MASQUESNI string `json:"masqueSni"`
    ThroughEndpoint string `json:"throughEndpoint"`
    InnerProtocol   string `json:"innerProtocol"`
}

// HistoryEntry — одна запись истории.
type HistoryEntry struct {
    ID         string          `json:"id"`         // имя файла без расширения
    SavedAt    time.Time       `json:"savedAt"`    // когда сохранено
    Config     ScanConfig      `json:"config"`     // параметры сканирования
    Report     core.ScanReport `json:"report"`     // результаты
}

// Settings — настройки приложения, сохраняемые между запусками.
type Settings struct {
    DefaultProtocol        string `json:"defaultProtocol"`
    DefaultPreset          string `json:"defaultPreset"`
    DefaultSamplePerSubnet int    `json:"defaultSamplePerSubnet"`
    DefaultTimeoutSec      int    `json:"defaultTimeoutSec"`
    DefaultTunnelPingCount int    `json:"defaultTunnelPingCount"`
    DefaultMTU             int    `json:"defaultMtu"`
    DefaultDNS             string `json:"defaultDns"`
    SaveHistoryEnabled     bool   `json:"saveHistoryEnabled"`
    HistoryLimit           int    `json:"historyLimit"`
    Theme                  string `json:"theme"`
    Language               string `json:"language"`
}

// UpdateInfo — информация о доступном обновлении.
type UpdateInfo struct {
    Available   bool   `json:"available"`
    LatestTag   string `json:"latestTag"`
    CurrentTag  string `json:"currentTag"`
    ReleaseURL  string `json:"releaseUrl"`
    ReleaseName string `json:"releaseName"`
    Error       string `json:"error,omitempty"`
}

const CurrentVersion = "0.1.0"
const checkForUpdatesURL = "https://api.github.com/repos/3inker/warpscout-gui/releases/latest"

// UpdateCache — кеш проверки обновлений.
type UpdateCache struct {
    LastCheck  time.Time  `json:"lastCheck"`
    UpdateInfo UpdateInfo `json:"updateInfo"`
}

func NewApp() *App {
    return &App{
        engine:      core.New(warpscout.NewMobileBackend()),
        socksEngine: core.New(warpscout.NewMobileBackend()),
        accountPath: accountFilePath(),
    }
}

// accountFilePath возвращает путь к файлу аккаунта в %APPDATA%\WarpScout\account.json
func accountFilePath() string {
    dir, err := os.UserConfigDir()
    if err != nil {
        // fallback — рядом с исполняемым файлом
        exe, _ := os.Executable()
        return filepath.Join(filepath.Dir(exe), "account.json")
    }
    return filepath.Join(dir, "WarpScout", "account.json")
}

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
    if err := a.loadAccount(); err != nil {
        // не критично — просто нет сохранённого аккаунта
        runtime.LogInfo(ctx, "account not loaded: "+err.Error())
    }
}

func (a *App) RegisterAccount() (string, error) {
    sink := func(event core.ProgressEvent) {
        runtime.EventsEmit(a.ctx, "progress", event)
    }
    account, err := a.engine.Register(a.ctx, core.RegisterOptions{}, sink)
    if err != nil {
        return "", err
    }
    a.mu.Lock()
    a.account = account
    a.mu.Unlock()

    // Сохраняем на диск
    if err := a.saveAccount(); err != nil {
        runtime.LogError(a.ctx, "failed to save account: "+err.Error())
    }

    return account.RawJSON, nil
}

// loadAccount читает аккаунт с диска, если файл существует.
func (a *App) loadAccount() error {
    data, err := os.ReadFile(a.accountPath)
    if err != nil {
        return err
    }
    var account core.Account
    if err := json.Unmarshal(data, &account); err != nil {
        return err
    }
    a.mu.Lock()
    a.account = account
    a.mu.Unlock()
    return nil
}

// saveAccount записывает текущий аккаунт на диск.
func (a *App) saveAccount() error {
    a.mu.Lock()
    account := a.account
    a.mu.Unlock()

    if account.RawJSON == "" {
        return nil
    }

    // Создаём папку, если её нет
    if err := os.MkdirAll(filepath.Dir(a.accountPath), 0700); err != nil {
        return err
    }

    data, err := json.MarshalIndent(account, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(a.accountPath, data, 0600)
}

// ForgetAccount удаляет сохранённый аккаунт.
func (a *App) ForgetAccount() error {
    a.mu.Lock()
    a.account = core.Account{}
    a.mu.Unlock()

    if err := os.Remove(a.accountPath); err != nil && !os.IsNotExist(err) {
        return err
    }
    return nil
}

// HasAccount сообщает интерфейсу, есть ли уже загруженный аккаунт.
func (a *App) HasAccount() bool {
    a.mu.Lock()
    defer a.mu.Unlock()
    return a.account.RawJSON != ""
}

func (a *App) StartScan(config ScanConfig) (core.ScanReport, error) {
    fmt.Printf("Scan config: sweepPorts=%q, port=%d, protocol=%q\n",
        config.SweepPorts, config.Port, config.Protocol)

    options := core.ScanOptions{
        Protocol:         core.Protocol(config.Protocol),
        ExcludeNodes:     splitComma(config.ExcludeNodes),
        ExcludeCountries: splitComma(config.ExcludeCountry),
        IncludeNodes:     splitComma(config.IncludeNodes),
        IncludeCountries: splitComma(config.IncludeCountry),
        SamplePerSubnet:  config.SamplePerSubnet,
        TimeoutSec:       config.TimeoutSec,
        TunnelPingCount:  config.TunnelPingCount,
        Full:             config.Full,
        CustomTarget:     config.CustomTarget,
        Port:             config.Port,
        SweepPorts:       config.SweepPorts,
        MTU:              config.MTU,
        DNS:              splitComma(config.DNS),
        SpeedTest:        config.SpeedTest,
        BestBy:           config.BestBy,
        PingTarget:       config.PingTarget,
        AWGJunkCount:     config.AWGJunkCount,
        AWGJunkMin:       config.AWGJunkMin,
        AWGJunkMax:       config.AWGJunkMax,
        AWGI1:            config.AWGI1,
        MASQUESNI: config.MASQUESNI,
        ThroughEndpoint: config.ThroughEndpoint,
        InnerProtocol:   core.Protocol(config.InnerProtocol),
    }

    sink := func(event core.ProgressEvent) {
        runtime.EventsEmit(a.ctx, "progress", event)
    }

    a.mu.Lock()
    account := a.account
    a.mu.Unlock()

    report, err := a.engine.Scan(a.ctx, account, options, sink)
    if err != nil {
        return core.ScanReport{}, err
    }

    a.mu.Lock()
    a.lastReport = report
    a.mu.Unlock()

    settings, _ := a.LoadSettings()
    if settings.SaveHistoryEnabled {
        if saveErr := a.SaveHistory(config); saveErr != nil {
            runtime.LogError(a.ctx, "failed to save history: "+saveErr.Error())
        }
    }

    return report, nil
}

func (a *App) CancelScan() {
    a.engine.Cancel()
}

func splitComma(s string) []string {
    if strings.TrimSpace(s) == "" {
        return nil
    }
    parts := strings.Split(s, ",")
    out := make([]string, 0, len(parts))
    for _, p := range parts {
        if v := strings.TrimSpace(p); v != "" {
            out = append(out, v)
        }
    }
    return out
}

// RenderConfigForEndpoint генерирует конфиг для указанного эндпоинта.
func (a *App) RenderConfigForEndpoint(endpoint core.EndpointResult, format string) (string, error) {
    a.mu.Lock()
    account := a.account
    a.mu.Unlock()

    if account.RawJSON == "" {
        return "", fmt.Errorf("account required: зарегистрируйте аккаунт")
    }

    // Определяем формат
    var configFormat core.ConfigFormat
    switch format {
    case "amneziawg":
        configFormat = core.ConfigAmneziaWG
    case "wireguard":
        configFormat = core.ConfigWireGuard
    case "usque":
        configFormat = core.ConfigUSQUE
    case "mihomo":
        configFormat = core.ConfigMihomo
    default:
        configFormat = core.ConfigAmneziaWG
    }

    // ScanOptions для рендера — минимальный набор
    options := core.ScanOptions{
        Protocol: core.ProtocolAWG,
    }

    return a.engine.RenderConfig(account, endpoint, options, configFormat)
}

// SaveFile открывает диалог сохранения и записывает контент в файл.
func (a *App) SaveFile(content string, defaultName string) (string, error) {
    path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
        DefaultFilename: defaultName,
        Title:           "Сохранить конфиг",
        Filters: []runtime.FileFilter{
            {DisplayName: "Config files", Pattern: "*.conf;*.json;*.yaml"},
            {DisplayName: "All files", Pattern: "*.*"},
        },
    })
    if err != nil {
        return "", err
    }
    if path == "" {
        // Пользователь отменил
        return "", nil
    }

    if err := os.WriteFile(path, []byte(content), 0600); err != nil {
        return "", err
    }
    return path, nil
}

// FindJunk запускает поиск параметров AWG junk.
func (a *App) FindJunk(config ScanConfig) (core.JunkProfile, error) {
    options := core.ScanOptions{
        SamplePerSubnet: config.SamplePerSubnet,
        TimeoutSec:      config.TimeoutSec,
        TunnelPingCount: config.TunnelPingCount,
    }

    sink := func(event core.ProgressEvent) {
        runtime.EventsEmit(a.ctx, "progress", event)
    }

    a.mu.Lock()
    account := a.account
    a.mu.Unlock()

    if account.RawJSON == "" {
        return core.JunkProfile{}, fmt.Errorf("account required: зарегистрируйте аккаунт")
    }

    return a.engine.FindJunk(a.ctx, account, options, sink)
}

// lastJunkPath возвращает путь к файлу последнего поиска junk.
func (a *App) lastJunkPath() string {
    return filepath.Join(filepath.Dir(a.accountPath), "last-junk.json")
}

// SaveLastJunk сохраняет результат поиска AWG junk в файл.
func (a *App) SaveLastJunk(profile core.JunkProfile) error {
    path := a.lastJunkPath()
    if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
        return err
    }
    data, err := json.MarshalIndent(profile, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(path, data, 0600)
}

// LoadLastJunk загружает последний сохранённый результат поиска AWG junk.
func (a *App) LoadLastJunk() (core.JunkProfile, error) {
    path := a.lastJunkPath()
    data, err := os.ReadFile(path)
    if err != nil {
        return core.JunkProfile{}, err
    }
    var profile core.JunkProfile
    if err := json.Unmarshal(data, &profile); err != nil {
        return core.JunkProfile{}, err
    }
    return profile, nil
}

// StartSocks запускает локальный SOCKS5-прокси на указанном эндпоинте.
func (a *App) StartSocks(endpoint string, port int, protocol string) error {
    options := core.SocksOptions{
        Endpoint: endpoint,
        Port:     port,
        Protocol: core.Protocol(protocol),
    }

    sink := func(event core.ProgressEvent) {
        runtime.EventsEmit(a.ctx, "progress", event)
    }

    a.mu.Lock()
    account := a.account
    a.mu.Unlock()

    if account.RawJSON == "" {
        return fmt.Errorf("account required: зарегистрируйте аккаунт")
    }

    // StartSocks блокирует до отмены, поэтому запускаем в горутине
    go func() {
        err := a.socksEngine.StartSocks(a.ctx, account, options, sink)
        if err != nil {
            runtime.EventsEmit(a.ctx, "socks-error", err.Error())
        }
        runtime.EventsEmit(a.ctx, "socks-stopped", nil)
    }()

    return nil
}

// StopSocks останавливает SOCKS-прокси.
func (a *App) StopSocks() {
    a.socksEngine.Cancel()
}

// RenderReport возвращает текстовый отчёт о последнем сканировании.
func (a *App) RenderReport() (string, error) {
    a.mu.Lock()
    report := a.lastReport
    a.mu.Unlock()

    if len(report.Results) == 0 {
        return "", fmt.Errorf("нет данных для отчёта — сначала выполните сканирование")
    }

    return a.engine.RenderReport(report)
}

// historyDir возвращает путь к папке истории.
func (a *App) historyDir() string {
    return filepath.Join(filepath.Dir(a.accountPath), "history")
}
// SaveHistory сохраняет текущий отчёт и конфиг в историю.
func (a *App) SaveHistory(config ScanConfig) error {
    a.mu.Lock()
    report := a.lastReport
    a.mu.Unlock()

    if len(report.Results) == 0 {
        return fmt.Errorf("нет данных для сохранения в историю")
    }

    dir := a.historyDir()
    if err := os.MkdirAll(dir, 0700); err != nil {
        return err
    }

    // ID = timestamp в формате, удобном для сортировки
    id := time.Now().UTC().Format("2006-01-02T15-04-05")
    entry := HistoryEntry{
        ID:      id,
        SavedAt: time.Now().UTC(),
        Config:  config,
        Report:  report,
    }

    data, err := json.MarshalIndent(entry, "", "  ")
    if err != nil {
        return err
    }

    path := filepath.Join(dir, id+".json")
    if err := os.WriteFile(path, data, 0600); err != nil {
        return err
    }

    settings, _ := a.LoadSettings()
    a.pruneHistory(settings.HistoryLimit)
    return nil
}

// ListHistory возвращает список записей (без полного отчёта — только метаданные).
func (a *App) ListHistory() ([]HistoryEntry, error) {
    dir := a.historyDir()
    entries, err := os.ReadDir(dir)
    if err != nil {
        if os.IsNotExist(err) {
            return []HistoryEntry{}, nil
        }
        return nil, err
    }

    var result []HistoryEntry
    for _, e := range entries {
        if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
            continue
        }
        path := filepath.Join(dir, e.Name())
        data, err := os.ReadFile(path)
        if err != nil {
            continue
        }
        var entry HistoryEntry
        if err := json.Unmarshal(data, &entry); err != nil {
            continue
        }
        // Для списка не нужен полный Report — обнуляем, чтобы не гонять данные
        entry.Report = core.ScanReport{}
        result = append(result, entry)
    }

    // Сортируем по времени — новые сверху
    sort.Slice(result, func(i, j int) bool {
        return result[i].SavedAt.After(result[j].SavedAt)
    })

    return result, nil
}

// LoadHistory загружает полную запись по ID.
func (a *App) LoadHistory(id string) (HistoryEntry, error) {
    path := filepath.Join(a.historyDir(), id+".json")
    data, err := os.ReadFile(path)
    if err != nil {
        return HistoryEntry{}, err
    }
    var entry HistoryEntry
    if err := json.Unmarshal(data, &entry); err != nil {
        return HistoryEntry{}, err
    }
    return entry, nil
}

// DeleteHistory удаляет запись по ID.
func (a *App) DeleteHistory(id string) error {
    path := filepath.Join(a.historyDir(), id+".json")
    if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
        return err
    }
    return nil
}

// pruneHistory удаляет старые записи, оставляя только последние maxCount.
func (a *App) pruneHistory(maxCount int) {
    entries, err := a.ListHistory()
    if err != nil || len(entries) <= maxCount {
        return
    }
    // entries отсортированы новые сверху — удаляем всё после maxCount
    for _, e := range entries[maxCount:] {
        _ = a.DeleteHistory(e.ID)
    }
}

// settingsPath возвращает путь к файлу настроек.
func (a *App) settingsPath() string {
    return filepath.Join(filepath.Dir(a.accountPath), "settings.json")
}

// defaultSettings возвращает настройки по умолчанию.
func defaultSettings() Settings {
    return Settings{
        DefaultProtocol:        "awg",
        DefaultPreset:          "standard",
        DefaultSamplePerSubnet: 5,
        DefaultTimeoutSec:      2,
        DefaultTunnelPingCount: 0,
        DefaultMTU:             0,
        DefaultDNS:             "",
        SaveHistoryEnabled:     true,
        HistoryLimit:           50,
        Theme:                  "system",
        Language:               getSystemLanguage(),
    }
}

// LoadSettings читает настройки из файла. Если файла нет — возвращает значения по умолчанию.
func (a *App) LoadSettings() (Settings, error) {
    path := a.settingsPath()
    data, err := os.ReadFile(path)
    validThemes := map[string]bool{
    "system":     true,
    "blacksoft":  true,
    "qdarkstyle": true,
    "flatgray":   true,
    "light":      true,
    "lightblue":  true,
    "softpink":   true,
}
    if err != nil {
        if os.IsNotExist(err) {
            return defaultSettings(), nil
        }
        return Settings{}, err
    }
    var s Settings
    if err := json.Unmarshal(data, &s); err != nil {
        return defaultSettings(), nil
    }
    // Заполняем пропущенные поля значениями по умолчанию
    def := defaultSettings()
    if s.DefaultProtocol == "" { s.DefaultProtocol = def.DefaultProtocol }
    if s.DefaultPreset == "" { s.DefaultPreset = def.DefaultPreset }
    if s.DefaultSamplePerSubnet == 0 { s.DefaultSamplePerSubnet = def.DefaultSamplePerSubnet }
    if s.DefaultTimeoutSec == 0 { s.DefaultTimeoutSec = def.DefaultTimeoutSec }
    if s.HistoryLimit == 0 { s.HistoryLimit = def.HistoryLimit }
    if !validThemes[s.Theme] {
    s.Theme = def.Theme
}
    if s.Language == "" { s.Language = def.Language }
    return s, nil
}

// SaveSettings записывает настройки в файл.
func (a *App) SaveSettings(s Settings) error {
    path := a.settingsPath()
    if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
        return err
    }
    data, err := json.MarshalIndent(s, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(path, data, 0600)
}

// CopyToClipboard копирует текст в системный буфер обмена.
func (a *App) CopyToClipboard(text string) {
    runtime.ClipboardSetText(a.ctx, text)
}

// ExportSettings открывает диалог сохранения и пишет settings.json.
func (a *App) ExportSettings() (string, error) {
    settings, err := a.LoadSettings()
    if err != nil {
        return "", err
    }

    path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
        DefaultFilename: "warpscout-settings.json",
        Title:           "Экспорт настроек",
        Filters: []runtime.FileFilter{
            {DisplayName: "JSON files", Pattern: "*.json"},
        },
    })
    if err != nil {
        return "", err
    }
    if path == "" {
        return "", nil // отменено
    }

    data, err := json.MarshalIndent(settings, "", "  ")
    if err != nil {
        return "", err
    }
    if err := os.WriteFile(path, data, 0600); err != nil {
        return "", err
    }
    return path, nil
}

// ImportSettings открывает диалог выбора и читает settings.json.
func (a *App) ImportSettings() (Settings, error) {
    path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
        Title: "Импорт настроек",
        Filters: []runtime.FileFilter{
            {DisplayName: "JSON files", Pattern: "*.json"},
        },
    })
    if err != nil {
        return Settings{}, err
    }
    if path == "" {
        return Settings{}, nil // отменено
    }

    data, err := os.ReadFile(path)
    if err != nil {
        return Settings{}, err
    }

    var s Settings
    if err := json.Unmarshal(data, &s); err != nil {
        return Settings{}, fmt.Errorf("invalid settings file: %w", err)
    }

    // Сохраняем импортированные настройки в основной файл
    if err := a.SaveSettings(s); err != nil {
        return Settings{}, err
    }

    return s, nil
}

// CheckForUpdates проверяет, есть ли новая версия на GitHub.
// CheckForUpdates проверяет обновления с кешированием на 24 часа.
// Если кеш свежий — возвращает кешированный результат.
func (a *App) CheckForUpdates() UpdateInfo {
    cache, err := a.loadUpdateCache()
    if err == nil && time.Since(cache.LastCheck) < 24*time.Hour {
        // Кеш свежий — возвращаем без запроса
        return cache.UpdateInfo
    }

    // Кеш устарел или отсутствует — делаем запрос
    info := a.fetchUpdates()

    // Сохраняем в кеш
    a.saveUpdateCache(UpdateCache{
        LastCheck:  time.Now(),
        UpdateInfo: info,
    })

    return info
}

// ForceCheckForUpdates — используется кнопкой «Проверить обновления».
// Игнорирует кеш, всегда делает запрос.
func (a *App) ForceCheckForUpdates() UpdateInfo {
    info := a.fetchUpdates()
    a.saveUpdateCache(UpdateCache{
        LastCheck:  time.Now(),
        UpdateInfo: info,
    })
    return info
}

// fetchUpdates — реальный запрос к GitHub API.
func (a *App) fetchUpdates() UpdateInfo {
    fmt.Println("[UPDATE] FETCHING FROM GITHUB")
    info := UpdateInfo{
        CurrentTag: CurrentVersion,
    }

    client := &http.Client{Timeout: 10 * time.Second}
    req, err := http.NewRequestWithContext(a.ctx, "GET", checkForUpdatesURL, nil)
    if err != nil {
        info.Error = err.Error()
        return info
    }
    req.Header.Set("User-Agent", "WarpScout/"+CurrentVersion)
    req.Header.Set("Accept", "application/vnd.github+json")

    resp, err := client.Do(req)
    if err != nil {
        info.Error = err.Error()
        return info
    }
    defer resp.Body.Close()

    if resp.StatusCode == 403 {
        info.Error = "github rate limit exceeded"
        return info
    }
    if resp.StatusCode == 404 {
        info.Error = "repository not found (placeholder URL)"
        return info
    }
    if resp.StatusCode != 200 {
        info.Error = fmt.Sprintf("github returned %d", resp.StatusCode)
        return info
    }

    var release struct {
        TagName string `json:"tag_name"`
        Name    string `json:"name"`
        HTMLURL string `json:"html_url"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
        info.Error = err.Error()
        return info
    }

    info.LatestTag = release.TagName
    info.ReleaseName = release.Name
    info.ReleaseURL = release.HTMLURL

    if isNewerVersion(release.TagName, CurrentVersion) {
        info.Available = true
    }
    return info
}

// isNewerVersion сравнивает версии в формате "v0.1.0" или "0.1.0".
// Возвращает true, если latest новее current.
func isNewerVersion(latest, current string) bool {
    latest = strings.TrimPrefix(latest, "v")
    current = strings.TrimPrefix(current, "v")

    lp := strings.Split(latest, ".")
    cp := strings.Split(current, ".")

    for i := 0; i < len(lp) && i < len(cp); i++ {
        ln, _ := strconv.Atoi(lp[i])
        cn, _ := strconv.Atoi(cp[i])
        if ln > cn {
            return true
        }
        if ln < cn {
            return false
        }
    }
    return false
}

// OpenReleasePage открывает URL релиза в системном браузере.
func (a *App) OpenReleasePage(url string) {
    runtime.BrowserOpenURL(a.ctx, url)
}

// updateCachePath возвращает путь к файлу кеша обновлений.
func (a *App) updateCachePath() string {
    return filepath.Join(filepath.Dir(a.accountPath), "update-cache.json")
}

// loadUpdateCache читает кеш обновлений.
func (a *App) loadUpdateCache() (UpdateCache, error) {
    data, err := os.ReadFile(a.updateCachePath())
    if err != nil {
        return UpdateCache{}, err
    }
    var c UpdateCache
    if err := json.Unmarshal(data, &c); err != nil {
        return UpdateCache{}, err
    }
    return c, nil
}

// saveUpdateCache записывает кеш обновлений.
func (a *App) saveUpdateCache(c UpdateCache) error {
    if err := os.MkdirAll(filepath.Dir(a.updateCachePath()), 0700); err != nil {
        return err
    }
    data, err := json.MarshalIndent(c, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(a.updateCachePath(), data, 0600)
}

func (a *App) FindSNI(config ScanConfig) (core.SNIProfile, error) {
    options := core.ScanOptions{
        Protocol:        core.Protocol(config.Protocol),
        SamplePerSubnet: config.SamplePerSubnet,
        TimeoutSec:      config.TimeoutSec,
        TunnelPingCount: config.TunnelPingCount,
    }

    sink := func(event core.ProgressEvent) {
        runtime.EventsEmit(a.ctx, "progress", event)
    }

    a.mu.Lock()
    account := a.account
    a.mu.Unlock()

    if account.RawJSON == "" {
        return core.SNIProfile{}, fmt.Errorf("account required: зарегистрируйте аккаунт")
    }

    return a.engine.FindSNI(a.ctx, account, options, sink)
}

// lastSNIPath возвращает путь к файлу последнего поиска SNI для протокола.
func (a *App) lastSNIPath(protocol string) string {
    // Нормализуем имя протокола: masque-h2 → masque-h2, masque → masque
    name := strings.ReplaceAll(protocol, "-", "_")
    if name == "" {
        name = "masque"
    }
    return filepath.Join(filepath.Dir(a.accountPath), "last-sni-"+name+".json")
}

// SaveLastSNI сохраняет результат поиска SNI для указанного протокола.
func (a *App) SaveLastSNI(protocol string, profile core.SNIProfile) error {
    path := a.lastSNIPath(protocol)
    if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
        return err
    }
    data, err := json.MarshalIndent(profile, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(path, data, 0600)
}

// LoadLastSNI загружает последний результат поиска SNI для указанного протокола.
func (a *App) LoadLastSNI(protocol string) (core.SNIProfile, error) {
    path := a.lastSNIPath(protocol)
    data, err := os.ReadFile(path)
    if err != nil {
        return core.SNIProfile{}, err
    }
    var profile core.SNIProfile
    if err := json.Unmarshal(data, &profile); err != nil {
        return core.SNIProfile{}, err
    }
    return profile, nil
}

// GenerateI1 генерирует I1-пакет (QUIC Initial) для указанного домена.
func (a *App) GenerateI1(host string) (string, error) {
    host = strings.TrimSpace(host)
    if host == "" {
        return "", fmt.Errorf("домен не может быть пустым")
    }
    return warpscout.GenerateI1(host)
}