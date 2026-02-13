class Normalized {
    constructor(
        batchId,
        importerId,
        partNumber,
        price,
        stock,
        timestamp
    ) {
        this.batchId = batchId;
        this.importerId = importerId;
        this.partNumber = partNumber;
        this.price = price;
        this.stock = stock;
        this.timestamp = timestamp;
    }

    normalize() {
        // Implement normalization logic here
    }
}

module.exports = Normalized;