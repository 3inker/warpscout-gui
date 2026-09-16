# WarpScout GUI

Portable Windows GUI for [WarpScout](https://github.com/vernette/warpscout) – Cloudflare WARP endpoint scanner.

Fork with additional tools from [warpscout-android](https://github.com/openwarpkit/warpscout-android).

[Русская версия](README.ru.md)

> Currently Windows-only. Linux and macOS support is planned for future releases.

## What is it

WarpScout finds working Cloudflare WARP endpoints – IP addresses and ports through which a tunnel can be established. For each endpoint, the app shows:

- **Exit region** (country where traffic exits).
- **Node** (IATA datacenter code: `DME`, `HEL`, `ARN`, etc.).
- **Ping** to the endpoint.
- **Tun Ping** – latency inside the tunnel.
- **Packet loss**.
- **Speed** (optional).
- **Working status** – whether the tunnel established.

## Features

### Scanning

- **Protocols:** AmneziaWG, WireGuard, MASQUE (QUIC), MASQUE (TCP).
- **Presets:** Standard, Durable, Full.
- **Advanced mode** – all parameters manually.
- **Filters:** include/exclude nodes and countries.
- **Custom ranges** (CIDR) instead of built-in pools.
- **Port sweep** – for networks where standard ports are closed.
- **WARP-in-WARP** – scanning from inside another tunnel.

### Tools

- **Find AWG junk** – search for AmneziaWG parameters (`jc`, `jmin`, `jmax`, `i1`) that pass through DPI.
- **Find MASQUE SNI** – search for an SNI that passes through DPI.
- **Generate I1** – from your own domain.
- **SOCKS proxy** – local SOCKS5 through a selected endpoint.

### Export

- **Configs:** AmneziaWG, WireGuard, usque, Mihomo.
- **Text report** of the scan.
- **Scan history** – with the ability to re-apply past settings.
- **Settings export/import**.

### Other

- **6 themes** – BlackSoft, QDarkStyle, FlatGray, Light, LightBlue, SoftPink.
- **System theme auto-detection**.
- **Localization** – Russian, English.
- **WARP account auto-registration** on first launch.
- **Update auto-check** (every 24 hours).
- **Help tab** with instructions.

## Installation

### Windows

1. Download `WarpScoutGUI-windows.exe` from the [latest release](../../releases/latest).
2. Run the downloaded `.exe` file.
3. On first launch, the app will **auto-register** a WARP account (takes up to a minute).

**Requirements:** Windows 10/11 (64-bit) with WebView2 (usually already installed).
**No admin rights** required. Data is stored in `%APPDATA%\WarpScout\`.

## Build from source

**Requirements:**

- Go 1.26.3+
- Node.js 20+
- Wails CLI v2.15.0

**Install Wails:**

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.15.0
```

**Build:**

```bash
git clone https://github.com/3inker/warpscout-gui.git
cd warpscout-gui/gui
wails build
```

Binary: `gui/build/bin/WarpScoutGUI.exe`

## How to use

1. **Launch the app** – the account will register automatically.
2. **Choose a protocol** – start with `AmneziaWG`.
3. **Click "Scan"** – wait 10–60 seconds.
4. **Review the results** – a table with endpoints.
5. **Save the config** – right-click a row → "Save config".

**More details** – the **Help** tab in the app.

## Data files

The app stores data in `%APPDATA%\WarpScout\`:

- `account.json` – WARP account.
- `settings.json` – settings.
- `history/` – scan history.
- `update-cache.json` – update check cache.
- `last-junk.json` – last AWG junk search.
- `last-sni-*.json` – last SNI searches.

## Roadmap

- ✅ **Windows** – available now.
- ⏳ **Linux** – planned.
- ⏳ **macOS** – planned.

## License

MIT – same as the original [warpscout](https://github.com/vernette/warpscout).

## Credits

- [vernette/warpscout](https://github.com/vernette/warpscout) – original CLI.
- [openwarpkit/warpscout-android](https://github.com/openwarpkit/warpscout-android) – Android fork with tools.