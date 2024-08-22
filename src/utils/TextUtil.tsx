function getFontSizeFromTextarea(element: HTMLElement) {
    const style = window.getComputedStyle(element);
    const fontSize = style.getPropertyValue('font-size');
    const fontFamily = style.getPropertyValue('font-family');
    const fontWeight = style.getPropertyValue('font-weight');
    const fontStyle = style.getPropertyValue('font-style');
    const fontVariant = style.getPropertyValue('font-variant');

    return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} ${fontFamily}`;
}

// Function to measure the width of a single character using canvas
export function getFontWidth(element: HTMLElement, character: string) {
    // Create a canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context == null) throw new Error("TextUtil:getFontWidth context is null")

    // Set the canvas context font to match the textarea's font
    context.font = getFontSizeFromTextarea(element);

    // Measure the width of the specified character
    const width = context.measureText(character).width;

    return width;
}
// Function to measure the height of the text using canvas
export function getFontHeight(element: HTMLElement, text = 'M') {
    // Create a canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context == null) throw new Error("TextUtil:getFontWidth context is null")

    // Set the canvas context font to match the textarea's font
    context.font = getFontSizeFromTextarea(element);

    // Measure the text width and height
    const metrics = context.measureText(text);
    const textWidth = metrics.width;

    // Set canvas size
    canvas.width = textWidth;
    canvas.height = parseInt(context.font);

    // Draw the text on the canvas
    context.fillText(text, 0, canvas.height);

    // Get pixel data of the canvas
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;

    // Calculate the height of the text
    let textHeight = 0;
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alphaIndex = (y * canvas.width + x) * 4 + 3;
            if (imageData[alphaIndex] > 0) {
                textHeight = Math.max(textHeight, y);
                break;
            }
        }
    }

    return textHeight;
}