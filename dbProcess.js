const mssql = require("mssql");

const connection = async (server_url, database_name, database_username, database_password) => {
    try {
        const config = {
            server: server_url,
            database: database_name,
            user: database_username,
            password: database_password,
            options: {
                encrypt: false,
                trustServerCertificate: true,
                enableArithAbort: true,
                cancelTimeout: 30000 // 30 seconds for cancel operations
            },
            connectionTimeout: 120000, // 120 seconds (2 minutes)
            requestTimeout: 600000, // 600 seconds (10 minutes) - very long for linked server queries
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };

        const pool = await mssql.connect(config);
        console.log("Connected to the database successfully!");
        return pool;
    } catch (error) {
        console.error("Database connection failed:", error);
        throw error;
    }
}

const closeConnection = async (pool) => {
    try {
        await pool.close();
        console.log("Database connection closed successfully!");
    } catch (error) {
        console.error("Error closing the database connection:", error);
        throw error;
    }
}

const readStagingData = async (database_url, database_name, database_username, database_password) => {
    let pool;
    try {
        pool = await connection(
            database_url,
            database_name,
            database_username,
            database_password
        );
        const result = await pool.request().query("SELECT * FROM EuropeanStockAndPriceStaging;");

        return result.recordset;

    } catch (error) {
        console.error("Error reading EuropeanStockAndPriceStaging:", error);
        throw error;

    } finally {
        if (pool) {
            await closeConnection(pool);
        }
    }
}

const saveNormalizedDataToStaging = async (normalizedData, database_url, database_name, database_username, database_password) => {
    let pool;
    try {
        pool = await connection(
            database_url,
            database_name,
            database_username,
            database_password
        );

        const table = new mssql.Table('EuropeanStockAndPriceStaging');
        table.create = false;
        table.columns.add('batchId', mssql.VarChar(100), { nullable: true });
        table.columns.add('importerId', mssql.VarChar(10), { nullable: false });
        table.columns.add('partNumber', mssql.VarChar(255), { nullable: false });
        table.columns.add('price', mssql.Decimal(14, 4), { nullable: true });
        table.columns.add('stock', mssql.Int, { nullable: true });

        normalizedData.forEach(item => {
            table.rows.add(
                item.batchId,
                item.importerId,
                item.partNumber,
                item.price,
                item.stock
            );
        });

        const request = pool.request();
        await request.bulk(table);

    } catch (error) {
        console.error("Error saving normalized data to staging:", error);
        throw error;
    } finally {
        if (pool) {
            await closeConnection(pool);
        }
    }
}

const truncateStagingTable = async (database_url, database_name, database_username, database_password) => {
    let pool;
    try {
        pool = await connection(
            database_url,
            database_name,
            database_username,
            database_password
        );
        await pool.request().query("TRUNCATE TABLE EuropeanStockAndPriceStaging;");
        console.log("Staging table truncated successfully!");
    } catch (error) {
        console.error("Error truncating staging table:", error);
        throw error;
    } finally {
        if (pool) {
            await closeConnection(pool);
        }
    }
}

const excecuteProcedureToUpdateMainTables = async (database_url, database_name, database_username, database_password) => {
    let pool;
    try {
        pool = await connection(
            database_url,
            database_name,
            database_username,
            database_password
        );
        await pool.request().query("EXEC CreateStockAndPriceTable;");
        console.log("Staging table turned as main table successfully!");
    } catch (error) {
        console.error("Error executing staging table procedure:", error);
        throw error;
    } finally {
        if (pool) {
            await closeConnection(pool);
        }
    }
}

const getNewTradeAgreements = async (database_url, database_name, database_username, database_password) => {
    let pool;
    try {
        pool = await connection(
            database_url,
            database_name,
            database_username,
            database_password
        );
        // const result = await pool.request().query("SELECT * FROM EuropeanTradeAgreements");
        const result = await pool.request().query(`SELECT * FROM EuropeanTradeAgreements;`);

        return result.recordset;

    } catch (error) {
        console.error("Error reading new trade agreements from staging:", error);
        throw error;

    } finally {
        if (pool) {
            await closeConnection(pool);
        }
    }
}

module.exports = {
    connection,
    closeConnection,
    readStagingData,
    saveNormalizedDataToStaging,
    excecuteProcedureToUpdateMainTables,
    truncateStagingTable,
    getNewTradeAgreements
};