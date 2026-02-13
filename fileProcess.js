const fs = require('fs');

const saveFileToLocal = (location, fileName, data) => {
    const filePath = `${location}/${fileName}`;
    fs.writeFileSync(filePath, data);
    console.log(`File saved successfully at ${filePath}`);
}

const readFileFromLocal = (location, fileName) => {
    const filePath = `${location}/${fileName}`;
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        console.log(`File read successfully from ${filePath}`);
        return data;
    } catch (err) {
        console.error(`Error reading file from ${filePath}:`, err.message);
        throw err;
    }
}



module.exports = {
    saveFileToLocal,
    readFileFromLocal
}