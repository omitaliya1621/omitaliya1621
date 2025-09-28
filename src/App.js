import './App.css';
// import ganpati from "./ganpati-bapa.jpg";
import React, { useState, useEffect } from "react";
import html2pdf from "html2pdf.js";

function App() {
  const [invoice, setInvoice] = useState({
    customerName: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    billNo: "",
    address: '',
    challanNo: "",
    state: "GUJARAT",
    gstin: "",
    items: [{ product: "", pc: "", rate: "", amount: "", cgst: 2.5, sgst: 2.5 }],
    discount: 0,
  });

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
  tempDiv.innerHTML =createSimpleInvoiceHTML();
  
  // Append to DOM in visible area
  tempDiv.style.position = 'relative';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.padding = '20px';
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
    
    return (`
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 2px solid #000; background: white; color: black;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="border: 1px solid #000; padding: 10px; display: inline-block; margin-bottom: 10px;">
            <h2 style="margin: 0; font-size: 18px;">TAX INVOICE</h2>
          </div>
          <p style="margin: 5px 0; font-size: 12px;">!! ** Shree Ganeshay Namah ** !!</p>
        </div>

        <!-- Company Info -->
        <div style="border: 1px solid #000; padding: 15px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">AENSI FASHION</h1>
          <p style="margin: 5px 0; font-size: 11px;">PLOT NO :: 16, THIRD FLOOR, SHIVAM INDUSTRIAL ESTATE, VARELI ,SURAT.</p>
          <p style="margin: 5px 0; font-size: 11px;">GSTIN :: 24CNVP0486P1ZT</p>
          <p style="margin: 5px 0; font-size: 11px;">(Mo):9989446895</p>
        </div>

        <!-- Billing Info -->
        <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; border: 1px solid #000; padding: 10px; vertical-align: top;">
              <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold;">Billing Address:</h3>
              <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">${invoice.customerName?.toUpperCase() || "MANGALAM CREATION"}</p>
              <p style="margin: 2px 0; font-size: 11px;">PLOT NO : 45 TO 48 VIDHATA IND.</p>
              <p style="margin: 2px 0; font-size: 11px;">PART:02 ,3RD FLOOR , HARIPURA GAM</p>
              <p style="margin: 2px 0; font-size: 11px;">KADODARA ROAD , SURAT</p>
              <p style="margin: 2px 0; font-size: 11px;">State : (24) GUJARAT</p>
              <p style="margin: 2px 0; font-size: 11px;">GSTIN : 24AGUPB3548G1ZD</p>
            </td>
            <td style="width: 50%; border: 1px solid #000; padding: 10px; vertical-align: top;">
              <p style="margin: 5px 0; font-size: 11px;">Invoice Date : <strong>${invoice.invoiceDate || "01-09-2025"}</strong></p>
              <p style="margin: 5px 0; font-size: 11px;">Challan No. : <strong>${invoice.challanNo || "08"}</strong></p>
              <p style="margin: 5px 0; font-size: 11px;">BILL NO     : <strong>${invoice.billNo || "10"}</strong></p>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">Sr</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">Name of Product</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">PC</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">Rate</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">Amount</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">CGST</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">UT/SGST</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item, i) => `
              <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: left;">${item.product.toUpperCase()}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.pc}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.rate}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.amount}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.cgst}% | ${(item.amount * item.cgst / 100).toFixed(0)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.sgst}% | ${(item.amount * item.sgst / 100).toFixed(0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Payment within 45 days</td>
              <td style="border: 1px solid #000; padding: 6px;"></td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Sub Total :</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">₹${totals.subTotal}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">-LESS DISCOUNT :-${invoice.discount}%</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">₹${totals.discount}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">+ SGST 2.5%</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">₹${totals.sgst}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">+ CGST 2.5%</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">₹${totals.cgst}</td>
            </tr>
            <tr style="border-top: 2px solid #000;">
              <td style="border: 1px solid #000; padding: 8px; font-weight: bold; font-size: 13px;">Net Amount :</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 13px;">₹${totals.net}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <table style="width: 100%; margin-top: 30px; font-size: 11px;">
          <tr>
            <td style="width: 50%;">For AENSI FASHION</td>
            <td style="width: 50%; text-align: right;">Authorised Signatory</td>
          </tr>
        </table>
      </div>
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
        {isGenerating ? '⏳ Generating PDF...' : '📄 Generate & Download Invoice'}
      </button>
    </div>
  );
}

export default App;