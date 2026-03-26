class TradeAgreement {
    constructor(
        id,
        articleNr,
        vendorId,
        vendorProductCode,
        newPurchasePrice
    ) {
        this.id = id;
        this.articleNr = articleNr;
        this.vendorId = vendorId;
        this.vendorProductCode = vendorProductCode;
        this.newPurchasePrice = newPurchasePrice;
    }
}

module.exports = TradeAgreement;