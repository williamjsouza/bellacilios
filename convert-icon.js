const sharp = require('sharp');
const path = require('path');

async function processIcon() {
  try {
    const input = path.join(__dirname, 'public/img/logo.png');
    const metadata = await sharp(input).metadata();
    
    // The logo is wide (2135x736). Let's assume the icon is in the left square (736x736).
    // Or we can just extract the whole thing and tint it white, but the user said "As letras Japonesas do Icone deve ser brancas".
    // Wait, let's crop the left square for the icon.
    const size = Math.min(metadata.width, metadata.height);
    
    // We can change the color to white by applying a composite.
    // First, crop the left part.
    const cropped = await sharp(input)
      .extract({ left: 0, top: 0, width: size, height: size })
      .toBuffer();
      
    // To turn the colored pixels white while keeping transparency, we can composite a solid white image 
    // over the cropped image using the 'in' blend mode (which keeps the destination's alpha channel).
    
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 3, // Create a solid RGB image
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([{ input: cropped, blend: 'dest-in' }])
    .png()
    .toFile(path.join(__dirname, 'public/favicon.png'));
    
    console.log('Created public/favicon.png successfully');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processIcon();
