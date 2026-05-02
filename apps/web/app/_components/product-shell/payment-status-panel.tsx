import { PaymentMethodForm, type CollectedPaymentMethod } from "../payment-method-form";
import { ShipWrightIcon } from "../shipwright-icon";
import { formatCurrency, type AppJob, type BusinessSession } from "../../_lib/product-state";
import { getPaymentPanelModel } from "../../_lib/payment-ui";
import { SectionTitle } from "./shared";

type PaymentStatusPanelProps = {
  collectedPaymentMethod: CollectedPaymentMethod | null;
  job: AppJob;
  onAuthorizePayment: (job: AppJob) => void;
  onCollectedPaymentMethod: (paymentMethod: CollectedPaymentMethod) => void;
  onResetCollectedPaymentMethod: () => void;
  paymentSubmitting: boolean;
  session: BusinessSession;
  stripeEnabled: boolean;
};

export function PaymentStatusPanel(props: PaymentStatusPanelProps) {
  const paymentPanel = getPaymentPanelModel({
    payment: props.job.payment,
    stripeEnabled: props.stripeEnabled,
    hasCollectedPaymentMethod: Boolean(props.collectedPaymentMethod)
  });

  return (
    <div className="ops-detail-grid">
      <section
        className={`sw-operational-surface ops-zone ops-payment-zone ${
          !paymentPanel.isFinal ? "ops-payment-zone-blocking" : ""
        }`}
        id="payment"
      >
        <div className="sw-card-header">
          <SectionTitle eyebrow="Payment" icon="payment" title="Status" />
        </div>
        <div className="ops-definition-list">
          <div>
            <dt>Customer total</dt>
            <dd>{formatCurrency(props.job.customerTotalCents, props.job.payment.currency)}</dd>
          </div>
          <div>
            <dt>Platform fee</dt>
            <dd>{formatCurrency(props.job.platformFeeCents, props.job.payment.currency)}</dd>
          </div>
          <div>
            <dt>Driver payout</dt>
            <dd>{formatCurrency(props.job.driverPayoutGrossCents, props.job.payment.currency)}</dd>
          </div>
          <div>
            <dt>Authorized</dt>
            <dd>{formatCurrency(props.job.payment.amountAuthorizedCents, props.job.payment.currency)}</dd>
          </div>
        </div>

        <div className="payment-panel">
          <div className="payment-panel-copy">
            <strong>{paymentPanel.headline}</strong>
            <p>{paymentPanel.detail}</p>
          </div>

          {props.collectedPaymentMethod ? (
            <div className="inline-details payment-method-summary">
              <span className="support-note">Collected payment method</span>
              <strong>
                {props.collectedPaymentMethod.brand?.toUpperCase() ?? "Card"}{" "}
                {props.collectedPaymentMethod.last4
                  ? `•••• ${props.collectedPaymentMethod.last4}`
                  : props.collectedPaymentMethod.id}
              </strong>
              <span>
                {props.collectedPaymentMethod.expMonth && props.collectedPaymentMethod.expYear
                  ? `Expires ${String(props.collectedPaymentMethod.expMonth).padStart(2, "0")}/${String(props.collectedPaymentMethod.expYear).slice(-2)}`
                  : "Ready for authorization"}
              </span>
              {!paymentPanel.isFinal ? (
                <button className="text-action" onClick={props.onResetCollectedPaymentMethod} type="button">
                  Replace payment method
                </button>
              ) : null}
            </div>
          ) : null}

          {paymentPanel.requiresMethodCollection ? (
            <PaymentMethodForm
              disabled={props.paymentSubmitting}
              email={props.session.email}
              onCollected={props.onCollectedPaymentMethod}
            />
          ) : null}

          <div className="sw-action-row">
            <button
              className="sw-button sw-button--primary button button-primary"
              disabled={props.paymentSubmitting || !paymentPanel.canAuthorize}
              onClick={() => props.onAuthorizePayment(props.job)}
              type="button"
            >
              <ShipWrightIcon name="payment" />
              <span>{props.paymentSubmitting ? "Authorizing payment..." : "Authorize Payment"}</span>
            </button>
          </div>
        </div>

        {props.job.payment.lastError ? <p className="form-error form-error-surface">{props.job.payment.lastError}</p> : null}
      </section>
    </div>
  );
}
