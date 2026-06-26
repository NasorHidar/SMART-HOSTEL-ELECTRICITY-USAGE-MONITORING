/**
 * models/Payment.js
 *
 * Tracks every payment transaction for hostel electricity bills.
 * One document per payment attempt; multiple docs may exist per billing month
 * (e.g., failed attempts followed by a successful one).
 */

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    // ── Reference Fields ────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },
    esp_id: {
      type: String,
      required: [true, 'esp_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },

    // ── Billing Details (snapshot at time of payment) ──────────────────────────
    billingMonth: {
      type: String,         // Format: "YYYY-MM" e.g. "2025-06"
      required: [true, 'billingMonth is required'],
      match: [/^\d{4}-\d{2}$/, 'billingMonth must be in YYYY-MM format'],
    },
    cumulativeKWh: {
      type: Number,
      default: 0,
    },
    energyCharge: {
      type: Number,
      required: true,
      min: 0,
    },
    demandCharge: {
      type: Number,
      default: 42.00,       // Flat 42 Tk/month per Bangladesh LT-A
    },
    amount: {
      type: Number,
      required: [true, 'amount is required'],
      min: 0,
    },

    // ── Payment Method & Gateway ────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: [
        'VISA', 'MASTERCARD', 'AMEX',
        'BKASH', 'NAGAD', 'ROCKET', 'UPAY',
        'OTHER'
      ],
      default: 'OTHER',
    },
    transactionId: {
      type: String,
      required: [true, 'transactionId is required'],
      unique: true,
      trim: true,
      index: true,
    },

    // ── Status Tracking ─────────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // ── Gateway Raw Response (for audit trail) ──────────────────────────────────
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Timestamps ─────────────────────────────────────────────────────────────
    paidAt: {
      type: Date,
      default: null,        // Set only when paymentStatus becomes 'paid'
    },
  },
  {
    timestamps: true,       // adds createdAt / updatedAt automatically
  }
);

// ── Compound index: look up all payments for a device in a specific month ──────
PaymentSchema.index({ esp_id: 1, billingMonth: 1 });
PaymentSchema.index({ esp_id: 1, paymentStatus: 1 });

// H1 FIX: Partial unique index to prevent double-payment race conditions.
// Two concurrent requests can both pass the findOne check and both create 'pending'
// records. This index ensures only ONE 'paid' record can exist per device per month.
// Failed/pending duplicates are still allowed (user may retry after a failure).
PaymentSchema.index(
  { esp_id: 1, billingMonth: 1, paymentStatus: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentStatus: 'paid' },
  }
);

module.exports = mongoose.model('Payment', PaymentSchema);
