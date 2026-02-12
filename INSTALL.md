# Battle Tanks: Seeker Edition — Installation

## APK Files
- `battle-tanks-seeker.apk` (25KB) — full version with icons
- `battle-tanks-minimal.apk` (21KB) — minimal version (no icons/theme)

## SHA256 Checksums
```
6c76fa08ee049669208ecfd2c138f26a51b4f95fdfda757b098c47bdba82f29d  battle-tanks-seeker.apk
```

## How to Download from GitHub

**IMPORTANT**: Do NOT right-click and "Save As" from the file view page!

1. Open the file in GitHub
2. Click the **"Download raw file"** button (download icon, top right)
3. Or use this direct raw URL pattern:
   ```
   https://raw.githubusercontent.com/Yeahch777/GoDayDen/claude/tank-game-seeker-dapp-Rarm4/battle-tanks-seeker.apk
   ```

## Verify Download

After downloading, check the file:
- File size must be exactly **25364 bytes** (full) or **20945 bytes** (minimal)
- First 2 bytes must be `PK` (ZIP signature)

**On Linux/Mac:**
```bash
sha256sum battle-tanks-seeker.apk
file battle-tanks-seeker.apk  # should say "Zip archive data"
```

**On Windows PowerShell:**
```powershell
Get-FileHash battle-tanks-seeker.apk -Algorithm SHA256
```

## Alternative: Self-extracting Script

If download keeps failing, use `install-battle-tanks.sh`:
```bash
bash install-battle-tanks.sh
```
This decodes the APK from embedded base64 — guaranteed no corruption.

## Troubleshooting "Failed to parse package"

1. Check file size matches exactly
2. Try `battle-tanks-minimal.apk` first (simpler, no resources)
3. Enable "Install from unknown sources" in Settings
4. Try installing via `adb install battle-tanks-seeker.apk`
