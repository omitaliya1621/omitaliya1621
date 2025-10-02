import './App.css';
// import ganpati from "./ganpati-bapa.jpg";
import React, { useState, useEffect } from "react";
import html2pdf from "html2pdf.js";

function App() {
  const [invoice, setInvoice] = useState({
    customerName: "",
    invoiceDate: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
    billNo: "",
    address: '',
    challanNo: "",
    state: "GUJARAT",
    gstin: "",
    items: [{ product: "", pc: "", rate: "", amount: "", cgst: 2.5, sgst: 2.5 }],
    discount: 0,
  });
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };
  console.log(formatDate(invoice.invoiceDate))

  const [errors, setErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-generate invoice number
  useEffect(() => {
    if (!invoice.billNo) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setInvoice(prev => ({
        ...prev,
        billNo: `INV-${year}${month}${day}-${randomNum}`
      }));
    }
  }, [invoice.billNo]);




  // Auto-calculate amount when rate or pc changes
  const calculateAmount = (pc, rate) => {
    const pieces = parseFloat(pc) || 0;
    const rateValue = parseFloat(rate) || 0;
    return (pieces * rateValue).toFixed(2);
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!invoice.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }

    if (!invoice.invoiceDate) {
      newErrors.invoiceDate = "Invoice date is required";
    }

    if (!invoice.billNo.trim()) {
      newErrors.billNo = "Bill number is required";
    }

    if (!invoice.address.trim()) {
      newErrors.address = "Customer address is required";
    }

    if (!invoice.gstin.trim()) {
      newErrors.gstin = "Customer GSTIN is required";
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(invoice.gstin)) {
      newErrors.gstin = "Please enter a valid GSTIN format";
    }

    // Validate items
    invoice.items.forEach((item, index) => {
      if (!item.product.trim()) {
        newErrors[`item_${index}_product`] = "Product name is required";
      }
      if (!item.pc || parseFloat(item.pc) <= 0) {
        newErrors[`item_${index}_pc`] = "Valid quantity is required";
      }
      if (!item.rate || parseFloat(item.rate) <= 0) {
        newErrors[`item_${index}_rate`] = "Valid rate is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoice({ ...invoice, [name]: value });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...invoice.items];
    newItems[index][name] = value;

    // Auto-calculate amount
    if (name === 'pc' || name === 'rate') {
      const pc = name === 'pc' ? value : newItems[index].pc;
      const rate = name === 'rate' ? value : newItems[index].rate;
      newItems[index].amount = calculateAmount(pc, rate);
    }

    setInvoice({ ...invoice, items: newItems });

    // Clear item error when user starts typing
    const errorKey = `item_${index}_${name}`;
    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: "" });
    }
  };

  const addItem = () => {
    setInvoice({
      ...invoice,
      items: [...invoice.items, { product: "", pc: "", rate: "", amount: "", cgst: 2.5, sgst: 2.5 }],
    });
  };

  const removeItem = (index) => {
    if (invoice.items.length > 1) {
      const newItems = invoice.items.filter((_, i) => i !== index);
      setInvoice({ ...invoice, items: newItems });
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const subTotal = invoice.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const discountPercentage = parseFloat(invoice.discount || 0);
    const discountAmount = (subTotal * discountPercentage) / 100;
    const taxableAmount = subTotal - discountAmount;
    const cgst = (taxableAmount * 2.5) / 100;
    const sgst = (taxableAmount * 2.5) / 100;
    const net = taxableAmount + cgst + sgst;

    return {
      subTotal: subTotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      net: net.toFixed(2)
    };
  };


  // ---------- HTML to PDF Generation ----------
  const generateHTMLToPDF = () => {
    if (!validateForm()) {
      alert("Please fix all errors before generating PDF");
      return;
    }

    setIsGenerating(true);

    // 1. Create visible temporary div
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = createSimpleInvoiceHTML();

    // Append to DOM in visible area
    tempDiv.style.position = 'relative';
    tempDiv.style.backgroundColor = 'white';
    // tempDiv.style.padding = '20px';
    // tempDiv.style.width = '800px';
    document.body.appendChild(tempDiv);

    // 2. Configure html2pdf
    const opt = {
      margin: 0.5,
      filename: `Invoice_${invoice.billNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // 3. Generate PDF
    html2pdf().set(opt).from(tempDiv).save().finally(() => {
      // 4. Cleanup
      document.body.removeChild(tempDiv);
      setIsGenerating(false);
    });
  };

  // Create simplified HTML template for invoice
  const createSimpleInvoiceHTML = () => {
    const totals = calculateTotals();

    return (`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Aensi Fashion - Tax Invoice</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      :root{
        --brand: #2f5fd1;       /* primary blue */
        --brand-ink: #1f3f8f;   /* darker blue for headings */
        --ink: #111;
        --muted: #6b7280;       /* gray-500 */
        --line: #1f2937;        /* gray-800 for table borders */
        --paper: #fff;
      }
      *{ box-sizing: border-box; }
      body{
        margin:0; background:#f5f6fa; color:var(--ink); font:13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .page{
        max-width: 800px; height:1000px; /* close to A4 at ~96dpi */
        border: 12px solid rgba(47,95,209,0.25);
        padding: 16px 16px 20px;
      }
      .border-box{
        border: 1px solid var(--line);
      }
      .top-strip{
        display:flex; align-items:center; justify-content:space-between;
        padding:6px 10px; border:1px solid var(--line); margin-bottom:8px;
        font-weight:600;
      }
      .top-strip .center{
        font-weight:700; letter-spacing:.5px;
      }

      .brand{
        text-align:center; border:1px solid var(--line); padding:10px 12px; margin-bottom:8px;
      }
      .brand h1{
        margin: 0; font-size: 36px; line-height:1.1; color: var(--brand-ink); font-weight:800;
      }
      .brand .tagline{
        margin: 4px 0 0; font-style: italic; color: var(--muted);
        font-size: 12px;
      }

      .address-line{
        border:1px solid var(--line); padding:8px 10px; margin-bottom:8px; text-align:center;
        font-weight:600;
      }

      .meta{
        display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:10px;
      }
      .meta .box{ padding:8px; }
      .meta-row{
        display:grid; grid-template-columns: 160px 1fr; gap:6px; align-items:center; margin:2px 0;
      }
      .line{
        border-bottom:1px dotted #999; min-height:18px;
      }

      .receiver{
        padding:8px; margin-bottom:10px;
      }
      .receiver h3{
        margin:0 0 6px; font-size:13px;
      }

      table{ border-collapse: collapse; width:100%; }
      .items th, .items td{
        border:1px solid var(--line);
        padding:6px 6px; vertical-align:top;
      }
      .items thead th{
        background: var(--brand-ink);
        color: #fff; text-align:center; font-weight:700;
      }
      .items .col-no{ width:36px; text-align:center; }
      .items .col-desc{ width:auto; }
      .items .col-hsn{ width:50px; text-align:center; }
      .items .col-pcs{ width:70px; text-align:center; }
      .items .col-rate{ width:110px; text-align:center; }
      .items .col-amt{ width:130px; text-align:center; }

      .totals{
        margin-top:8px;
        display:grid; grid-template-columns: 1fr 420px; gap:10px;
      }
      .amount-words{
        border:1px solid var(--line); padding:8px; min-height:68px;
      }
      .summary table td{
        border:1px solid var(--line); padding:6px;
      }
      .summary tr td:first-child{ font-weight:700; }
      .summary tr td:last-child{ text-align:right; }

      .terms{
        margin-top:10px; border:1px solid var(--line); padding:8px;
      }
      .foot-sign{
        margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;
      }
      .sign-box{
        text-align:right; font-weight:600;
      }
      .brand-small{
        color: var(--brand-ink); font-weight:800; font-size:16px; text-align:right;
      }

      @media print{
        body{ background:var(--paper); }
        .page{ margin:0; border-width:12px; }
      }
    </style>
  </head>
  <body>
    <main class="page" role="document" aria-label="Tax Invoice">
      <div class="top-strip" aria-label="Top strip">
        <div>Vishvas Mo. 99984 46895</div>
        <div class="center">TAX INVOICE</div>
        <div style="opacity:0">Vishvas Mo. 99984 46895</div>
      </div>

      <header class="brand" role="banner">
        <h1>Aensi Fashion </h1>
        <p class="tagline">Exclusive Embroidery Job Work</p>
      </header>

      <div class="address-line">
        Plot No. 16, Third Floor, Shivam Ind. Nr. Vareli Gam Garden Mill, Kadodara Road, Surat.
      </div>

      <section class="meta" aria-label="Invoice meta">
        <div class="box border-box">
          <div class="meta-row"><div><strong>State :</strong></div><div class="line">Gujarat</div></div>
          <div class="meta-row"><div><strong>State Code :</strong></div><div class="line">24</div></div>
          <div class="meta-row"><div><strong>GSTIN :</strong></div><div class="line">24CNVPV0486P1ZT</div></div>
          <div class="meta-row"><div><strong>PAN No :</strong></div><div class="line">AEKPV9368N</div></div>
          <div class="meta-row"><div><strong>Vehicle No. :</strong></div><div class="line">&nbsp;</div></div>
        </div>
        <div class="box border-box">
          <div class="meta-row"><div><strong>Invoice No. :</strong></div><p class="line">${invoice.billNo?.toUpperCase()}</p></div>
          <div class="meta-row"><div><strong>Invoice Date :</strong></div><div class="line">${formatDate(invoice.invoiceDate)}</div></div>
          <div class="meta-row"><div><strong>Challan No. :</strong></div><div class="line">${invoice.challanNo?.toUpperCase()}</div></div>
        </div>
      </section>

      <section class="receiver border-box" aria-label="Receiver details">
        <h3>Details of Receiver / Billed to</h3>
        <div class="meta-row"><div><strong>Buyers Name :</strong></div><p class="line">${invoice.customerName?.toUpperCase()}</p></div>
        <div class="meta-row"><div><strong>Address :</strong></div><p class="line">${invoice.address?.toUpperCase()}</p></div>
        <div class="meta-row"><div><strong>Partys GSTIN :</strong></div><p class="line">${invoice.gstin?.toUpperCase()}</p></div>
        <div class="meta-row"><div><strong>State :</strong></div><div class="line">${invoice.state?.toUpperCase()}</div></div>
      </section>

      <section aria-label="Items">
        <table class="items">
          <thead>
            <tr>
              <th class="col-no">No.</th>
              <th class="col-desc">Discription Of Goods</th>
              <th class="col-hsn">HSN Code</th>
              <th class="col-pcs">Pcs.</th>
              <th class="col-rate">Rate</th>
              <th class="col-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
               ${invoice.items.map((item, i) => `
  <tr>
    <td class="col-no">${i + 1}</td>
    <td class="col-desc">${item.product.toUpperCase()}</td>
    <td class="col-hsn"></td>
    <td class="col-pcs">${item.pc}</td>
    <td class="col-rate">${item.rate}</td>
    <td class="col-amt">${item.amount}</td>
  </tr>
`).join('')}

${Array.from({ length: Math.max(0, 5 - invoice.items.length) }).map(() => `
  <tr>
    <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
  </tr>
`).join('')}

          </tbody>
        </table>
      </section>

      <section class="totals" aria-label="Totals">
        <div class="amount-words">
       <p style="margin:0;padding:0"> <strong style="margin:0;">Note:
        </strong><p>
         <span style="opacity:.75">_______________________________________</span>
         <span style="opacity:.75">_______________________________________</span>
         <span style="opacity:.75">_______________________________________</span>
         <span style="opacity:.75">_______________________________________</span>
         <span style="opacity:.75">_______________________________________</span>
         <span style="opacity:.75">_______________________________________</span>
        </div>
        <div class="summary">
          <table>
            <tr>
              <td>Less Discount @&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoice.discount}%</td>
              <td>₹${totals.discount}</td>
            </tr>
            <tr>
              <td>Total Amount Before Tax</td>
              <td>₹${totals.subTotal}</td>
            </tr>
            <tr>
              <td>Add: CGST@&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.5%</td>
              <td>₹${totals.sgst}</td>
            </tr>
            <tr>
              <td>Add: SGST@&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.5%</td>
              <td>₹${totals.sgst}</td>
            </tr>
            <tr>
              <td><strong>Total Amount After Tax</strong></td>
              <td><strong>₹${totals.net}</strong></td>
            </tr>
          </table>
        </div>
      </section>

      <section style="display:flex; margin-top:8px; justify-content:space-between;">
      <div>
      <h5>Term & condition</h5>
      <ul  style='list-style:none'>
      <li>(1) Goods Once sold cannot be returned</li>
      <li>(2) Interest @ 24% is chargeable if payment not made within 30 days:</li>
      <li>(3) Payment to be Made A/c Payee's Cheque & NEFT Only</li>
      <li>(4) No Dying Guarantee:</li>
      <li>(5) Subject to SURAT Jurisdiction</li>
      </ul>
      </div>
       <div class="sign-box" style="padding-top:35px; padding-right:8px">
          <div class="brand-small">Aensi Fashion</div>
          <div style="margin-top:15px;">Authorised Signatory</div>
        </div>
      </section>
    
    </main>
  </body>
</html>
`);
  };




  const totals = calculateTotals();

  return (
    <div className="invoice-container">
      <div className="invoice-header">
        <h1>Invoice Generator</h1>
        <p>OM ITALIYA : <a href='tel:8469531178'>8469531178</a></p>
      </div>

      {/* Customer Information Section */}
      <div className="form-section">
        <h2 className="section-title">Customer Information</h2>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="customerName">Customer Name *</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              className="form-input"
              placeholder="Enter customer name"
              value={invoice.customerName}
              onChange={handleChange}
            />
            {errors.customerName && <div className="error-message">⚠️ {errors.customerName}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="invoiceDate">Invoice Date *</label>
            <input
              type="date"
              id="invoiceDate"
              name="invoiceDate"
              className="form-input"
              value={invoice.invoiceDate}
              onChange={handleChange}
            />
            {errors.invoiceDate && <div className="error-message">⚠️ {errors.invoiceDate}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="billNo">Bill Number *</label>
            <input
              type="text"
              id="billNo"
              name="billNo"
              className="form-input"
              placeholder="Auto-generated"
              value={invoice.billNo}
              onChange={handleChange}
            />
            {errors.billNo && <div className="error-message">⚠️ {errors.billNo}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="challanNo">Challan Number</label>
            <input
              type="text"
              id="challanNo"
              name="challanNo"
              className="form-input"
              placeholder="Enter challan number"
              value={invoice.challanNo}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="gstin">Customer GSTIN *</label>
            <input
              type="text"
              id="gstin"
              name="gstin"
              className="form-input"
              placeholder="22AAAAA0000A1Z5"
              value={invoice.gstin}
              onChange={handleChange}
              maxLength="15"
            />
            {errors.gstin && <div className="error-message">⚠️ {errors.gstin}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="state">State</label>
            <input
              type="text"
              id="state"
              name="state"
              className="form-input"
              value={invoice.state}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="address">Customer Address *</label>
          <textarea
            id="address"
            name="address"
            className="form-input"
            placeholder="Enter complete customer address"
            value={invoice.address}
            onChange={handleChange}
          />
          {errors.address && <div className="error-message">⚠️ {errors.address}</div>}
        </div>
      </div>

      {/* Items Section */}
      <div className="items-section">
        <h2 className="section-title">Invoice Items</h2>
        {invoice.items.map((item, i) => (
          <div key={i} className="item-row">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="product"
                className="item-input"
                placeholder="Enter product name"
                value={item.product}
                onChange={(e) => handleItemChange(i, e)}
              />
              {errors[`item_${i}_product`] && <div className="error-message">⚠️ {errors[`item_${i}_product`]}</div>}
            </div>

            <div className="form-group">
              <label>Quantity (PC) *</label>
              <input
                type="number"
                name="pc"
                className="item-input"
                placeholder="0"
                value={item.pc}
                onChange={(e) => handleItemChange(i, e)}
                min="0"
                step="0.01"
              />
              {errors[`item_${i}_pc`] && <div className="error-message">⚠️ {errors[`item_${i}_pc`]}</div>}
            </div>

            <div className="form-group">
              <label>Rate (₹) *</label>
              <input
                type="number"
                name="rate"
                className="item-input"
                placeholder="0.00"
                value={item.rate}
                onChange={(e) => handleItemChange(i, e)}
                min="0"
                step="0.01"
              />
              {errors[`item_${i}_rate`] && <div className="error-message">⚠️ {errors[`item_${i}_rate`]}</div>}
            </div>

            <div className="form-group">
              <label>Amount (₹)</label>
              <input
                type="text"
                className="item-input"
                value={`₹${item.amount || '0.00'}`}
                readOnly
                style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}
              />
            </div>

            <div className="form-group">
              <button
                type="button"
                className="remove-item-btn"
                onClick={() => removeItem(i)}
                disabled={invoice.items.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="add-item-btn" onClick={addItem}>
          ➕ Add New Item
        </button>
      </div>

      {/* Discount Section */}
      <div className="form-section">
        <h2 className="section-title">Additional Information</h2>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="discount">Discount Percentage (%)</label>
            <input
              type="number"
              id="discount"
              name="discount"
              className="form-input"
              placeholder="0"
              value={invoice.discount}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <h2 className="section-title">Invoice Summary</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <div className="summary-label">Sub Total</div>
            <div className="summary-value">₹{totals.subTotal}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Discount</div>
            <div className="summary-value">-₹{totals.discount}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">CGST (2.5%)</div>
            <div className="summary-value">₹{totals.cgst}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">SGST (2.5%)</div>
            <div className="summary-value">₹{totals.sgst}</div>
          </div>
          <div className="summary-item" style={{ borderLeftColor: '#27ae60', backgroundColor: '#e8f5e8' }}>
            <div className="summary-label">Net Amount</div>
            <div className="summary-value" style={{ color: '#27ae60', fontSize: '1.4rem' }}>₹{totals.net}</div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="generate-btn"
        onClick={generateHTMLToPDF}
        disabled={isGenerating}
      >
        {isGenerating ? '⏳ Generating PDF...' : 'Download Invoice'}
      </button>
    </div>
  );
}

export default App;