import './App.css';
// import ganpati from "./ganpati-bapa.jpg";
import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 👈 run only once


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

  // Create table data structure
  const createTableData = () => {
    const tableData = {
      headers: ["Sr", "Name of Product", "PC", "Rate", "Amount", "CGST", "UT/SGST"],
      subHeaders: {
        CGST: ["Rate", "Amt."],
        UT_SGST: ["Rate", "Amt."]
      },
      rows: invoice.items.map((item, i) => ({
        sr: i + 1,
        product: item.product,
        pc: item.pc,
        rate: item.rate,
        amount: item.amount,
        cgst: {
          rate: `${item.cgst}%`,
          amount: (item.amount * item.cgst / 100).toFixed(0)
        },
        sgst: {
          rate: `${item.sgst}%`,
          amount: (item.amount * item.sgst / 100).toFixed(0)
        }
      }))
    };
    return tableData;
  };

  // Create totals data structure
  const createTotalsData = () => {
    const subTotal = invoice.items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
    const discountPercentage = Number(invoice.discount || 0);
    const discountAmount = (subTotal * discountPercentage) / 100;
    const taxableAmount = subTotal - discountAmount;
    const cgst = (taxableAmount * 2.5) / 100;
    const sgst = (taxableAmount * 2.5) / 100;
    const net = taxableAmount + cgst + sgst;

    return {
      paymentTerms: "Payment within 45 days",
      subTotal: subTotal.toFixed(0),
      discount: {
        percentage: discountPercentage,
        amount: discountAmount.toFixed(0)
      },
      sgst: sgst.toFixed(0),
      cgst: cgst.toFixed(0),
      netAmount: net.toFixed(0)
    };
  };

  // ---------- PDF Generation ----------
  const generatePDF = () => {
    if (!validateForm()) {
      alert("Please fix all errors before generating PDF");
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;

      // ---------------- HEADER SECTION ----------------
      // Page border
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

      // TAX INVOICE Title
      doc.setFontSize(14).setFont("helvetica", "bold");
      doc.text("TAX INVOICE", pageWidth / 2, 20, { align: "center" });

      // Devotional text
      doc.setFontSize(10).setFont("helvetica", "normal");
      doc.text("!!** Shree Ganeshay Namah **!!", pageWidth / 2, 28, { align: "center" });

      // Company Name
      doc.setFontSize(20).setFont("helvetica", "bold");
      doc.text("AENSI FASHION", pageWidth / 2, 40, { align: "center" });

      // Company Address
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(
        "PLOT NO:: 16, THIRD FLOOR, SHIVAM INDUSTRIAL ESTATE, VARELI, SURAT",
        pageWidth / 2,
        50,
        { align: "center" }
      );
      doc.text(
        "GSTIN :: 24CNVPV0486P1ZT (Mo):9998446895",
        pageWidth / 2,
        58,
        { align: "center" }
      );

      // ---------------- SEPARATORS ----------------
      doc.setLineWidth(0.5);
      doc.line(margin, 68, pageWidth - margin, 68); // Top separator
      doc.line(margin, 78, pageWidth - margin, 78); // Billing section separator

      // ---------------- BILLING INFO ----------------
      const leftColumnX = margin + 5;
      const rightColumnX = pageWidth / 2 + 5;
      const billingStartY = 83;

      // Left Column - Billing Address
      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.text("Billing Address:", leftColumnX, billingStartY);

      let billingY = billingStartY + 8;
      const customerName = invoice.customerName || "Customer Name";
      doc.text(customerName, leftColumnX, billingY);
      billingY += 6;

      // Address Lines
      let addressLines = [];
      if (invoice.address) {
        const lines = invoice.address
          .split("\n")
          .map(line => line.trim())
          .filter(Boolean);

        addressLines = lines[0] === invoice.customerName ? lines.slice(1) : lines;
      } else {
        addressLines = [
          "PLOT NO: 45 TO 48 VIDHATA IND.",
          "PART:02, 3RD FLOOR, HARIPURA GAM",
          "KADODARA ROAD, SURAT",
        ];
      }

      const maxWidth = pageWidth / 2 - 20;
      addressLines.forEach(line => {
        const wrapped = doc.splitTextToSize(line, maxWidth);
        wrapped.forEach(wrap => {
          doc.text(wrap, leftColumnX, billingY);
          billingY += 5;
        });
      });

      // State & GSTIN
      doc.text(`State : (24) ${invoice.state}`, leftColumnX, billingY);
      billingY += 5;
      doc.text(`GSTIN : ${invoice.gstin || "GSTIN"}`, leftColumnX, billingY);
      billingY += 5;

      // Right Column - Invoice Details
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(`Invoice Date: ${invoice.invoiceDate}`, rightColumnX, billingStartY);
      doc.text(`Challan No  : ${invoice.challanNo}`, rightColumnX, billingStartY + 6);
      doc.text(`BILL NO     : ${invoice.billNo}`, rightColumnX, billingStartY + 12);

      // Vertical Divider Line
      const lineX = pageWidth / 2;
      const lineStartY = 78;
      const lineEndY = billingY + 3;
      doc.line(lineX, lineStartY, lineX, lineEndY);

      // Horizontal line before Table
      const tableStartY = lineEndY;
      doc.line(margin, tableStartY, pageWidth - margin, tableStartY);

      // ---------------- ITEM TABLE ----------------
      autoTable(doc, {
        startY: tableStartY + 5,
        head: [createTableData().headers],
        body: createTableData().rows.map(row => [
          row.sr,
          row.product,
          row.pc,
          row.rate,
          row.amount,
          `${row.cgst.rate} | ${row.cgst.amount}`,
          `${row.sgst.rate} | ${row.sgst.amount}`,
        ]),
        styles: {
          fontSize: 10,
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
          cellPadding: 3,
          halign: "center",
          valign: "middle",
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          1: { halign: "left", cellWidth: 35 },
          2: { halign: "center", cellWidth: 15 },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "center", cellWidth: 22 },
          5: { halign: "center", cellWidth: 30 },
          6: { halign: "center", cellWidth: 30 },
        },
        theme: "grid",
        margin: { left: margin, right: margin },
      });

      // Add Sub-Headers for CGST/SGST
      const tableEndY = doc.lastAutoTable.finalY;
      const tableStartX = margin;
      const cgstStartX = tableStartX + 12 + 35 + 15 + 18 + 22;
      const utsgstStartX = cgstStartX + 30;

      doc.setLineWidth(0.3);
      doc.line(cgstStartX + 15, tableStartY + 5, cgstStartX + 15, tableEndY);
      doc.line(utsgstStartX + 15, tableStartY + 5, utsgstStartX + 15, tableEndY);

      doc.setFontSize(8).setFont("helvetica", "bold");
      doc.text("Rate", cgstStartX + 7, tableStartY + 2, { align: "center" });
      doc.text("Amt.", cgstStartX + 22, tableStartY + 2, { align: "center" });
      doc.text("Rate", utsgstStartX + 7, tableStartY + 2, { align: "center" });
      doc.text("Amt.", utsgstStartX + 22, tableStartY + 2, { align: "center" });

      // ---------------- TOTALS SECTION ----------------
      const totalsData = createTotalsData();
      const totalsTableStartY = doc.lastAutoTable.finalY + 10;
      const fullTableWidth = pageWidth - 2 * margin;

      autoTable(doc, {
        startY: totalsTableStartY,
        head: [["", ""]],
        body: [
          [totalsData.paymentTerms, ``],
          [`Sub Total :`, totalsData.subTotal],
          [`-LESS DISCOUNT :-${totalsData.discount.percentage}`, totalsData.discount.amount],
          [`+ SGST 2.5%`, totalsData.sgst],
          [`+ CGST 2.5%`, totalsData.cgst],
          [`Net Amount :`, totalsData.netAmount],
        ],
        styles: {
          fontSize: 10,
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
          cellPadding: 3,
          halign: "left",
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "left", cellWidth: fullTableWidth * 0.7, fontStyle: "bold" },
          1: { halign: "right", cellWidth: fullTableWidth * 0.3, fontStyle: "bold" },
        },
        theme: "grid",
        showHead: false,
        margin: { left: margin, right: margin },
        tableWidth: fullTableWidth,
        didDrawCell: data => {
          if (data.row.index === 0) {
            doc.setFontSize(10).setFont("helvetica", "normal");
          } else if (data.row.index === 4) {
            doc.setLineWidth(0.5);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          } else if (data.row.index === 5) {
            doc.setFontSize(12).setFont("helvetica", "bold");
          } else {
            doc.setFontSize(10).setFont("helvetica", "bold");
          }
        },
      });

      // ---------------- FOOTER ----------------
      const footerY = pageHeight - 30;
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text("For AENSI FASHION", margin + 5, footerY);
      doc.text("Authorised Signatory", pageWidth - 50, footerY);

      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

      // Save PDF
      doc.save("invoice.pdf");

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
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
        onClick={generatePDF}
        disabled={isGenerating}
      >
        {isGenerating ? '⏳ Generating PDF...' : '📄 Generate & Download Invoice'}
      </button>
    </div>
  );
}

export default App;