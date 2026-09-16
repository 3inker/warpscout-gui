# WarpScout GUI v0.1.0

First public release of the Windows GUI for the Cloudflare WARP endpoint scanner.

This is a **portable application** – it runs directly from the `.exe` file. No installation required.

## What it can do

- **Scanning** – AmneziaWG, WireGuard, MASQUE (QUIC and TCP).
- **Filters** – include/exclude nodes and countries.
- **Tools** – find AWG junk, find MASQUE SNI, generate I1, SOCKS proxy.
- **Export** – AmneziaWG/WireGuard/usque/Mihomo configs, text report.
- **Scan history** – with the ability to re-apply past settings.
- **6 themes** + system theme auto-detection.
- **Localization** – Russian, English.
- **Auto-registration** of WARP account on first launch.

## How to run

1. Download `WarpScoutGUI-windows.exe`.
2. Run the downloaded `.exe` file.
3. On first launch, the app will **auto-register** a WARP account (takes up to a minute).

## Notes

- **Requirements:** Windows 10/11 (64-bit) with WebView2 (usually already installed).
- **No admin rights** required.
- **Data location:** `%APPDATA%\WarpScout\` (account, settings, history).

---

# WarpScout GUI v0.1.0

Первый публичный релиз Windows-приложения для сканера эндпоинтов Cloudflare WARP.

Это **портативное приложение** – работает прямо из `.exe`-файла. Установка не требуется.

## Что умеет

- **Сканирование** – AmneziaWG, WireGuard, MASQUE (QUIC и TCP).
- **Фильтры** – включить/исключить узлы и страны.
- **Инструменты** – поиск AWG junk, поиск MASQUE SNI, генерация I1, SOCKS-прокси.
- **Экспорт** – конфиги AmneziaWG/WireGuard/usque/Mihomo, текстовый отчёт.
- **История сканирований** – с возможностью применить прошлые настройки.
- **6 тем** + автоопределение темы системы.
- **Локализация** – русский, английский.
- **Авторегистрация** WARP-аккаунта при первом запуске.

## Как запустить

1. Скачайте `WarpScoutGUI-windows.exe`.
2. Запустите скачанный `.exe` файл.
3. При первом запуске приложение **само зарегистрирует** WARP-аккаунт (займёт до минуты).

## Примечания

- **Требования:** Windows 10/11 (64-бит) с WebView2 (обычно уже установлен).
- **Права администратора** не нужны.
- **Расположение данных:** `%APPDATA%\WarpScout\` (аккаунт, настройки, история).