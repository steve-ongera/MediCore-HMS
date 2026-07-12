//src/pages/billing/WalkInSale.jsx
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { searchMedicines, createOTCSale } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "CARD", label: "Card" },
];

export default function WalkInSale() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const [cart, setCart] = useState([]); // [{ medicine, quantity }]
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchMedicines(query);
        setResults(Array.isArray(data) ? data : data?.results ?? []);
      } catch (err) {
        toast.error(err.message || "Failed to search medicines");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addToCart = (medicine) => {
    setCart((current) => {
      const existing = current.find((item) => item.medicine.id === medicine.id);
      if (existing) {
        return current.map((item) =>
          item.medicine.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { medicine, quantity: 1 }];
    });
    setQuery("");
    setResults([]);
  };

  const updateQuantity = (medicineId, quantity) => {
    if (quantity < 1) return;
    setCart((current) =>
      current.map((item) => (item.medicine.id === medicineId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (medicineId) => {
    setCart((current) => current.filter((item) => item.medicine.id !== medicineId));
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.medicine.unit_price) * item.quantity, 0);
  const discountValue = Number(discount) || 0;
  const total = Math.max(subtotal - discountValue, 0);

  const resetSale = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setAmountPaid("");
  };

  const handleCompleteSale = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Add at least one item to the cart");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        discount: discountValue,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        amount_paid: amountPaid === "" ? total : Number(amountPaid),
        items: cart.map((item) => ({ medicine: item.medicine.id, quantity: item.quantity })),
      };
      const sale = await createOTCSale(payload);
      toast.success(`Sale ${sale.sale_number} completed`);
      setReceipt(sale);
      resetSale();
    } catch (err) {
      toast.error(err.message || "Failed to complete sale");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Pharmacy</div>
          <h1 className="page-title">Walk-in Sale</h1>
          <p className="page-subtitle">Sell medicine directly over the counter — no patient record required</p>
        </div>
      </div>

      <div className="pos-layout">
        <div className="pos-layout__main">
          <div className="card mb-3">
            <div className="card-header">
              <span className="cell-primary">Find Medicine</span>
            </div>
            <div className="card-body">
              <input
                className="form-control"
                placeholder="Search by medicine or generic name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />

              {searching && <p className="text-tertiary text-sm mt-2">Searching...</p>}

              {results.length > 0 && (
                <div className="pos-results mt-2">
                  {results.map((medicine) => (
                    <button
                      type="button"
                      key={medicine.id}
                      className="pos-results__item"
                      onClick={() => addToCart(medicine)}
                      disabled={medicine.current_stock <= 0}
                    >
                      <div>
                        <div className="cell-primary">{medicine.name}</div>
                        <div className="text-2xs text-tertiary">
                          {medicine.generic_name || "—"} &middot; {medicine.current_stock} {medicine.unit}
                          {medicine.current_stock !== 1 ? "s" : ""} in stock
                        </div>
                      </div>
                      <span className="cell-mono">KES {Number(medicine.unit_price).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="cell-primary">Cart</span>
              <span className="text-tertiary text-sm">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="card-body p-0">
              {cart.length === 0 ? (
                <p className="text-tertiary text-center py-4">Cart is empty. Search for a medicine to add it.</p>
              ) : (
                <table className="table-simple">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.medicine.id}>
                        <td className="cell-primary">{item.medicine.name}</td>
                        <td>
                          <div className="qty-stepper">
                            <button type="button" onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}>
                              <i className="bi bi-dash"></i>
                            </button>
                            <span>{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}>
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                        </td>
                        <td className="cell-mono">KES {Number(item.medicine.unit_price).toLocaleString()}</td>
                        <td className="cell-mono">
                          KES {(Number(item.medicine.unit_price) * item.quantity).toLocaleString()}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn-icon-only"
                            style={{ color: "var(--danger-strong)" }}
                            onClick={() => removeFromCart(item.medicine.id)}
                            title="Remove"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="pos-layout__side">
          <form className="card" onSubmit={handleCompleteSale}>
            <div className="card-header">
              <span className="cell-primary">Order Summary</span>
            </div>
            <div className="card-body">
              <div className="form-field">
                <label className="form-label">Customer name (optional)</label>
                <input
                  className="form-control"
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Customer phone (optional)</label>
                <input
                  className="form-control"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="pos-summary-line">
                <span className="text-tertiary">Subtotal</span>
                <span className="cell-mono">KES {subtotal.toLocaleString()}</span>
              </div>

              <div className="form-field">
                <label className="form-label">Discount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="pos-summary-line pos-summary-line--total">
                <span>Total</span>
                <span className="cell-mono">KES {total.toLocaleString()}</span>
              </div>

              <div className="form-field">
                <label className="form-label">Payment method</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {paymentMethod !== "CASH" && (
                <div className="form-field">
                  <label className="form-label">
                    {paymentMethod === "MPESA" ? "M-Pesa code" : "Card auth reference"}
                  </label>
                  <input
                    className="form-control"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>
              )}

              <div className="form-field">
                <label className="form-label">Amount paid (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  placeholder={total.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className="btn btn-primary w-100" disabled={submitting || cart.length === 0}>
                {submitting ? "Processing..." : `Complete Sale — KES ${total.toLocaleString()}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {receipt && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">Sale Complete</h2>
              <button type="button" className="btn-icon-only" onClick={() => setReceipt(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-panel__body">
              <p className="cell-primary">{receipt.sale_number}</p>
              <p className="text-tertiary text-sm">
                {receipt.customer_name || "Walk-in Customer"} &middot; {formatDateTime(receipt.sold_at)}
              </p>

              <table className="table-simple">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.medicine_name}</td>
                      <td>{item.quantity}</td>
                      <td className="cell-mono">KES {Number(item.subtotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pos-summary-line pos-summary-line--total">
                <span>Total Paid</span>
                <span className="cell-mono">KES {Number(receipt.total_amount).toLocaleString()}</span>
              </div>
            </div>
            <div className="modal-panel__footer">
              <button type="button" className="btn btn-outline" onClick={() => setReceipt(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <i className="bi bi-printer me-2"></i>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}