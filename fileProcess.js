const fs = require('fs');

const saveFileToLocal = (location, fileName, data) => {
    const filePath = `.${location}/${fileName}`;
    const dir = `.${location}`;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
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

const createCSVStringFromData = (data) => {
    const header = Object.keys(data[0]).join(';') + '\n';
    const rows = data.map(row => Object.values(row).join(';')).join('\n');
    return header + rows;
}

// const create 


module.exports = {
    saveFileToLocal,
    readFileFromLocal,
    createCSVStringFromData

}