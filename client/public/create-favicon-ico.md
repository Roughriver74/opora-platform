# Создание ICO фавикона

Для создания favicon.ico из SVG файла используйте один из этих способов:

## Вариант 1: Онлайн конвертер

1. Откройте https://convertio.co/svg-ico/
2. Загрузите файл `favicon-16.svg`
3. Выберите размеры: 16x16, 32x32
4. Скачайте как `favicon.ico`

## Вариант 2: ImageMagick (командная строка)

```bash
# Установите ImageMagick
brew install imagemagick  # macOS
# или
sudo apt install imagemagick  # Ubuntu

# Конвертируйте
convert favicon-16.svg -resize 32x32 -resize 16x16 favicon.ico
```

## Вариант 3: GIMP

1. Откройте GIMP
2. Импортируйте `favicon-16.svg`
3. Измените размер на 32x32 или 16x16
4. Экспортируйте как .ico

## Результат

Замените существующий `favicon.ico` на новый файл с шестиугольным логотипом.
