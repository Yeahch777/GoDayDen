# Battle Tanks: Seeker Edition v0.3.0 — Installation

## APK File
- `battle-tanks-seeker.apk` — **25364 bytes** (25KB)

## SHA256 Checksum
```
b13f323aa626529d8e6837c2bcad2e8ef3c0327382200d1121c03a82a4b7d468  battle-tanks-seeker.apk
```

## How to Download from GitHub

**IMPORTANT**: GitHub показывает HTML-страницу (~165KB) вместо самого файла!

### Способ 1: Raw-ссылка (рекомендуется)
```
https://raw.githubusercontent.com/Yeahch777/GoDayDen/claude/tank-game-seeker-dapp-Rarm4/battle-tanks-seeker.apk
```

### Способ 2: Кнопка Download
1. Откройте файл на GitHub
2. Нажмите кнопку **"Download raw file"** (иконка скачивания, справа вверху)

### Способ 3: Git clone
```bash
git clone -b claude/tank-game-seeker-dapp-Rarm4 https://github.com/Yeahch777/GoDayDen.git
# APK будет в корне: GoDayDen/battle-tanks-seeker.apk
```

### Способ 4: Self-extracting script
```bash
# Скачайте install-battle-tanks.sh и запустите:
bash install-battle-tanks.sh
# APK будет создан из встроенного base64 — гарантия без повреждений
```

## Проверка файла

После скачивания ОБЯЗАТЕЛЬНО проверьте:
- Размер **ровно 25364 байт** (25KB). Если ~165KB — вы скачали HTML-страницу!
- Первые 2 байта: `PK` (ZIP-подпись)

```bash
ls -la battle-tanks-seeker.apk   # размер должен быть 25364
file battle-tanks-seeker.apk     # должно быть "Zip archive data" или "Android package"
```

## Установка
1. Включите **"Установка из неизвестных источников"** в настройках
2. Откройте APK-файл через файловый менеджер
3. Или используйте ADB: `adb install battle-tanks-seeker.apk`
