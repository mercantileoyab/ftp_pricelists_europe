const dotenv = require('dotenv');

const { getData } = require('./ftpConnection');
const { saveFileToLocal, readFileFromLocal, createCSVStringFromData } = require('./fileProcess');
const { readStagingData, saveNormalizedDataToStaging, truncateStagingTable, excecuteProcedureToUpdateMainTables, getNewTradeAgreements } = require('./dbProcess');
const { uploadFileToSFTP } = require('./sftpConnections');
const Normalized = require('./models/normalized');
const TradeAgreement = require('./models/tradeageement');

const { Readable } = require('stream');

dotenv.config();

const importerId = {
    autoPartner: '61-40648',
    interParts: '61-40448'
}

const configForGatewaySFTP = {
    host: process.env.FTP_HOST_GATEWAY,
    port: process.env.FTP_PORT_GATEWAY,
    username: process.env.FTP_USER_GATEWAY,
    password: process.env.FTP_PASSWORD_GATEWAY,
    folderNameForArticlesStock: process.env.FTP_FOLDERNAME_ARTICLESTOCK_GATEWAY,
    folderNameForTradeAgreements: process.env.FTP_FOLDERNAME_TRADEAGREEMENTS_GATEWAY,
    fileNameForArticlesStock: process.env.FTP_FILENAME_ARTICLESTOCK_GATEWAY,
    fileNameForTradeAgreements: process.env.FTP_FILENAME_TRADEAGREEMENTS_GATEWAY
}

const generateBatchId = () => {
    const timestamp = Date.now().toString(36);
    const randomString = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomString}`;
}

const normalizeDataForAutoPartner = async (batchId) => {
    // Data in 2 files: pricelist and stock, need to merge them based on part number
    const priceData = await readFileFromLocal('./raw', `pricelist_${importerId.autoPartner}.csv`);
    const stockData = await readFileFromLocal('./raw', `stock_${importerId.autoPartner}.csv`);

    let stockdata = {};
    let normalizedData = [];

    // Stock has two locations => combine stock for both locations into one total stock value per part number
    await stockData.split('\n').slice(1).forEach(line => {
        // Skip empty lines
        if (!line.trim()) return;
        
        const [ partNumber, stock, branch ] = line.split(';');
        
        // Skip lines with missing critical data
        if (!partNumber || !stock) return;
        
        if (!stockdata[partNumber]) {
            stockdata[partNumber] = parseInt(stock);
        } else {
            stockdata[partNumber] = parseInt(stockdata[partNumber]) + parseInt(stock);
        }
    });

    priceData.split('\n').slice(1).forEach(line => {
        // Skip empty lines
        if (!line.trim()) return;
        
        const [ partNumber, name, indexTD, brand, partnerNumber, price, brandTD, currency ] = line.split(';');
        
        // Skip lines with missing critical data
        if (!partNumber || !price) return;
        
        const normalizedEntry = new Normalized(
            batchId,
            importerId.autoPartner,
            partNumber,
            parseFloat(price.replace(',', '.')),
            parseInt(stockdata[partNumber] || '0'),
            new Date()
        );
        normalizedData.push(normalizedEntry);
    });    

    return Promise.resolve(normalizedData)
}

const normalizeDataForInterParts = async (batchId) => {
    // Data in 1 file, but need to split price and stock info into separate fields
    const data = await readFileFromLocal('./raw', `stock_${importerId.interParts}.csv`);
    let normalizedData = [];
    
    data.split('\n').slice(1).forEach(line => {
        // Skip empty lines
        if (!line.trim()) return;
        
        const [ brand, intrastat, partNumber, productOrigin, weight, height, width, length, ean, tecdocArNr, depositValue, unitPrice, stock ] = line.split(';');
        
        // Skip lines with missing critical data
        if (!partNumber || !unitPrice || !stock) return;
        
        const normalizedEntry = new Normalized(
            batchId,
            importerId.interParts,
            partNumber,
            parseFloat(unitPrice.replace(',', '.')),
            parseInt(stock),
            new Date()
        );
        normalizedData.push(normalizedEntry);
    });

    return Promise.resolve(normalizedData)
}

const createNormalizedData = async (batchId) => {
    let normalizedData = [];
    // const interpartsData = await normalizeDataForInterParts(batchId);
    // normalizedData = normalizedData.concat(interpartsData);
    // normalizedData = normalizedData.concat(interpartsData);
    normalizedData = normalizedData.concat(await normalizeDataForAutoPartner(batchId));
    normalizedData = normalizedData.concat(await normalizeDataForInterParts(batchId));
    return normalizedData;
}

const createTradeAgreementsCSV = (tradeAgreementsFromDB) => {
    const tradeAgreements = tradeAgreementsFromDB.map(row => {
        return new TradeAgreement(
            row.ID,
            row.ArticleNr,
            row.VendorId,
            row.VendorProductCode,
            row.NewPurchasePrice
        );
    });
    return createCSVStringFromData(tradeAgreements);
}

const integrationWorkFlow = async () => {
    
    const batchId = generateBatchId();
    
    try {
        
        // Step 1: Get data from AutoPartner FTP server, stock and price in separate files
        const autoPartnerPricelist = await getData(process.env.FTP_HOST_AUTOPARTNER, process.env.FTP_USER_AUTOPARTNER, process.env.FTP_PASSWORD_AUTOPARTNER, process.env.FTP_FILENAME_AUTOPARTNER_PRICELIST)
        const autoParnerStock = await getData(process.env.FTP_HOST_AUTOPARTNER, process.env.FTP_USER_AUTOPARTNER, process.env.FTP_PASSWORD_AUTOPARTNER, process.env.FTP_FILENAME_AUTOPARTNER_STOCK)

        // Step 2: Get data from Inter parts FTP server
        const interPartsStockAndPricelist = await getData(process.env.FTP_HOST_INTERPARTS, process.env.FTP_USER_INTERPARTS, process.env.FTP_PASSWORD_INTERPARTS, process.env.FTP_FILENAME_INTERPARTS)

        // Step 3: Save data to local files (for backup and staging purposes)
        await saveFileToLocal('./raw', `pricelist_${importerId.autoPartner}.csv`, autoPartnerPricelist);
        await saveFileToLocal('./raw', `stock_${importerId.autoPartner}.csv`, autoParnerStock);
        await saveFileToLocal('./raw', `stock_${importerId.interParts}.csv`, interPartsStockAndPricelist);

        // Step 3: Normalize data
        data = await createNormalizedData(batchId);
        
        // Step 4: Truncate and save data to database staging table
        await truncateStagingTable(process.env.ORUM_DATABASE_URL, process.env.ORUM_DATABASE_NAME, process.env.ORUM_DATABASE_USERNAME, process.env.ORUM_DATABASE_PASSWORD);
        await saveNormalizedDataToStaging(data, process.env.ORUM_DATABASE_URL, process.env.ORUM_DATABASE_NAME, process.env.ORUM_DATABASE_USERNAME, process.env.ORUM_DATABASE_PASSWORD);

        // Step 5: Run SQL procedure to update main tables
        await excecuteProcedureToUpdateMainTables(process.env.ORUM_DATABASE_URL, process.env.ORUM_DATABASE_NAME, process.env.ORUM_DATABASE_USERNAME, process.env.ORUM_DATABASE_PASSWORD);

    } catch (error) {
        console.error('Error in integration workflow:', error);
    }
}

const runTradeAgreementsWorkflow = async () => {
    // Send Article stock data & new trade agreements (EUR -articles) to Gateway SFTP server
        
    // Step 1: Get new trade agreements from database
    const newTradeAgreements = await getNewTradeAgreements(process.env.ORUM_DATABASE_URL, process.env.ORUM_DATABASE_NAME, process.env.ORUM_DATABASE_USERNAME, process.env.ORUM_DATABASE_PASSWORD);
    // Step 2: Create CSV string for new trade agreements and save temp to local folder
    await saveFileToLocal('tradeagreements', 'tradeagreements.csv', createTradeAgreementsCSV(newTradeAgreements));
    // Step 3: Upload the created CSV file to Gateway SFTP server
    await uploadFileToSFTP(configForGatewaySFTP, '.tradeagreements/tradeagreements.csv', `${configForGatewaySFTP.folderNameForTradeAgreements}/${configForGatewaySFTP.fileNameForTradeAgreements}`);
}

const wantedTask = process.argv[2];

switch(wantedTask) {
    case 'tradeagreements':
        console.log('--------------------------------');
        console.log('Running trade agreements workflow');
        console.log('--------------------------------');
        runTradeAgreementsWorkflow();
        break;
    default:
        console.log('--------------------------------');
        console.log('Running integration workflow');
        console.log('--------------------------------');
        integrationWorkFlow();
}