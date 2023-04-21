import { createWriteStream } from 'fs';
import PDFDocument from 'pdfkit';

import pdfGenerate from './md2pdf';
import contractStr from '../collateral/contract.txt';

import { CollateralProposal } from '@Types/collateral';

describe('pdfGenerate', () => {
  it('should render a pdf', () => {
    const todayDate = new Date().toLocaleDateString('it-IT');
    const proposal: CollateralProposal = {
      financing: {
        financedOnTopPercentage: 0,
        financedOnTopEuro: 0,
        capitalFinancedEuro: 73500,
        paidToBorrowerBst: 73132.5,
        paidToInsuranceBst: 367.5,
        exchangeFeePercentage: 0.1,
        financingExchangeFeeEuro: 73.13250000000001,
      },
      interest: {
        stabilityFeePercentage: 0.6,
        platformFeePercentage: 0.3,
        platformFeeEuro: 220.5,
        stabilityFeeEuro: 441,
        totalInterestPercentage: 0.8999999999999999,
        totalInterestEuro: 661.5,
      },
      reimbursement: {
        totalReimbursementWithoutExchangeFeeEuro: 74166,
        reimbursementExchangeFeeEuro: 74.166,
        exchangeFeePercentage: 0.1,
        totalReimbursementEuro: 74240.166,
      },
      bankApiCosts: {
        ssdCost: 0.5,
        apiCallCostEuro: 1,
        apiCallsPerInvoice: 4,
        totalApiCostsEuro: 4.5,
      },
      operationalCosts: {
        insuranceCostEuro: 367.5,
        financingExchangeFeeEuro: 73.13250000000001,
        reimbursementExchangeFeeEuro: 74.166,
        totalApiCostsEuro: 4.5,
        totalOperationalCostsEuro: 519.2985,
        exchangeFeePercentage: 0.01,
      },
      financials: {
        assetClass: 'invoice',
        collateralValueEuro: 105000,
        capitalFinancedEuro: 73500,
        capitalFinancedPercentage: 70,
        totalInterestPercentage: 0.8999999999999999,
        totalInterestEuro: 661.5,
        totalOperationalCostsPercentage: 0.7065285714285714,
        totalOperationalCostsEuro: 519.2985,
        youGetBstEuro: 73132.5,
        youPayEuro: 74240.166,
        tan: 0.8999999999999999,
        taegValue: 1548.2984999999999,
        taegPercentage: 2.1065285714285715,
      },
      proposalExpiryDate: new Date('2022-12-22T00:00:00.000Z'),
      due: {
        gracePeriodDays: 5,
        loanExpiryDate: new Date('2022-12-22T00:00:00.000Z'),
        defaultDate: new Date('2022-12-22T00:00:00.000Z'),
      },
    };
    const insurance = {
      insuranceCostEuro: 367.5,
      insuranceCostPercentage: 0.5,
      insuranceCostPercentageBst: 0.5,
    };
    const collaterals = [
      {
        invoiceId: 'sdsdas9879',
        totalValue: 10000,
        paymentDueDate: new Date('2022-12-22T00:00:00.000Z'),
        totalTaxes: 1222,
        debtor: {
          businessName: 'Company X',
          partitaIVA: '2132344',
          fiscalCode: 'IT123456789',
          address: 'address',
          city: 'city',
        },
      },
    ];

    const contractTxt = contractStr({
      todayDate,
      tcDate: todayDate,
      username: 'John Wick',
      proposal,
      insurance,
      collaterals,
    });
    const pdfDoc = new PDFDocument({ bufferPages: true });
    // pdfDoc.pipe(createWriteStream('contract.pdf'));
    const doc = pdfGenerate(pdfDoc, contractTxt);
    expect(doc).toBeDefined();
  });
});
