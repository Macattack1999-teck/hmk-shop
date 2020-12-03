import React, { useEffect, useState, useContext } from "react";
import CartContext from "../../Contexts/CartContext";
import { Link, Redirect } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "firebase/auth";
import firebase from "firebase/app";
import "firebase/functions";
import {
  useElements,
  useStripe,
  PaymentRequestButtonElement
} from "@stripe/react-stripe-js";
import PaypalBtn from "../paypal/PaypalBtn";
import OrderSummary from "./OrderSummary";
import AddShippingAddressForm from "./AddShippingAddressForm";
import AddPaymentMethodForm from "./AddPaymentMethodForm";
import ChoosePaymentMethod from "./ChoosePaymentMethod";
import ChooseShippingAddress from "./ChooseShippingAddress";
// import axios from 'axios'

export default () => {
  // TODO Add Free Shipping Logic On Orders Over $100
  // Todo Add Logic To Add Discount
  // TODO Remove Create Account Component and create an account simultaniously when creating an order
  const [email, setEmail] = useState("");
  
  
  const [phone, setPhone] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  // const [customerData, setCustomerData] = useState({});
  const [billingAddresses, setBillingAddresses] = useState([]);
  const [billingAddress, setBillingAddress] = useState(false);
  
  const [noBillingAddresses, setNoBillingAddresses] = useState(false);
  const [userUID, setUserUID] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(false);
  const [noBillingAddressSelected, setNoBillingAddressSelected] = useState(
    false
  );
  const [noPaymentMethodSelected, setNoPaymentMethodSelected] = useState(false);
  const [noEmail, setNoEmail] = useState(false);
  const [noPhoneNumber, setNoPhoneNumber] = useState(false);
  const [noPaymentMethods, setNoPaymentMethods] = useState(false);

  const [paymentRequest, setPaymentRequest] = useState(null);
  const [
    expressCheckoutPaymentSubmitting,
    setExpressCheckoutPaymentSubmitting
  ] = useState(false);
  const [discount, setDiscount] = useState("");
  const [activeDiscount, setActiveDiscount] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const [ orderSummaryHidden, setOrderSummaryHidden ] = useState(true)
  const [ testerState, setTesterState ] = useState(false)
  let discountTester = false
  const [ collapsableOrderSummaryOpen, setCollapsableOrderSummaryOpen ] = useState(false);
  const [ collapsableOrderSummaryMaxHeight, setCollapsableOrderSummaryMaxHeight ] = useState(101);

  useEffect(() => {
    if (stripe) {
      let productObjectsToDisplayInCheckout = [];

      products.map(product => {
        const productPrice = product[0].product.price;
        const title = product[0].product.title;
        const quantity = product[4].quantity;

        return productObjectsToDisplayInCheckout.push({
          amount: productPrice * quantity * 100,
          label: title
        });
      });

      const expressCheckoutSubtotal = products.reduce((accum, currentVal) => {
        return (accum += currentVal[4].quantity * currentVal[0].product.price);
      }, 0);

      const shippingOptions =
        expressCheckoutSubtotal < 100
          ? [
              {
                id: "standard-shipping",
                label: "Standard shipping",
                detail: "Arrives in 5 to 7 days",
                amount: 600
              }
            ]
          : [
              {
                id: "free-shipping",
                label: "Free shipping",
                detail: "Arrives in 5 to 7 days",
                amount: 0
              }
            ];

      const paymentRequest = stripe.paymentRequest({
        country: "US",
        currency: "usd",
        total: {
          label: "Purchase total",
          amount:
            expressCheckoutSubtotal < 100
              ? (expressCheckoutSubtotal + 6) * 100
              : expressCheckoutSubtotal * 100
        },
        displayItems: productObjectsToDisplayInCheckout,
        requestPayerName: true,
        requestPayerEmail: true,
        requestShipping: true,
        shippingOptions: shippingOptions
      });

      paymentRequest.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(paymentRequest);
        }
      });
    }
  }, [stripe]);

  useEffect(() => {
    if (paymentRequest) {
      paymentRequest.on("shippingaddresschange", ev => {
        ev.updateWith({
          status: "success"
        });
      });
    }
  }, [stripe, paymentRequest]);

  useEffect(() => {
    // console.log(activeDiscount, 'TESTING')
    if (paymentRequest && !expressCheckoutPaymentSubmitting) {
      // let evMark = []
      // if (paymentRequest && !tester) {
      // console.log(activeDiscount, 'TEST')
      paymentRequest.on("token", async ev => {
        // evMark.push(ev)
        // console.log(ev)
        // if (evMark.length === 2) {
        //   console.log(ev, 'THING')
        // }
        // if (paymentRequest && !tester) {
        //   console.log(ev)
        // }
        // if (testerState) {
          // } else {
            //   console.log(activeDiscount)
            // }
            // console.log(discountTester)
            // console.log(ev)
            // if (testerState) {
              // console.log(activeDiscount)
            // }
        setExpressCheckoutPaymentSubmitting(true);
        // tester = true
        // console.log(ev, "EVENT", activeDiscount);
        let test = [];
        products.map(product => {
          const productId = product[0].product.id;
          const productPrice = product[0].product.price;
          const title = product[0].product.title;
          const quantity = product[4].quantity;
          const productColor = product[2].color;
          const productSize = product[1].size;
          return test.push({
            productId,
            title,
            productPrice,
            quantity,
            productColor,
            productSize
          });
        });

        // console.log(activeDiscount, "TESTERING")

        const data = {
          products: test,
          discount: activeDiscount
        };

        const createExpressCheckoutPaymentIntent = firebase
          .functions()
          .httpsCallable("createExpressCheckoutPaymentIntent");
        const result = await createExpressCheckoutPaymentIntent(data)
        // console.log(result)
          // .then(async result => {
          //   console.log(result)
          // console.log(result)
        const {
          paymentIntent,
          error: confirmError
        } = await stripe.confirmCardPayment(result.data.client_secret, {
          payment_method: {
            type: "card",
            card: {
              token: ev.token.id
            }
          }
        });

        // console.log(paymentIntent, "PAYMENT INTENT");

        if (confirmError) {
          /////////////////
          // TODO /////////
          // Report to the browser that the payment failed, prompting it to
          // re-show the payment interface, or show an error message and close
          // the payment interface.
          ev.complete("fail");
        } else {
          ev.complete("success");

          if (paymentIntent.status === "requires_action") {
            const { error } = await stripe.confirmCardPayment(
              result.data.client_secret
            );

            if (error) {
              ///////////////
              //// TODO /////
              // The payment failed -- ask your customer for a new payment method.
            } else {
              const shippingDetails = {
                name: ev.payerName,
                address: {
                  line1: ev.shippingAddress.addressLine,
                  postal_code: ev.shippingAddress.postalCode,
                  city: ev.shippingAddress.city,
                  state: ev.shippingAddress.region,
                  country: ev.shippingAddress.country
                }
              };

              let expressCheckoutPurchasedProducts = [];
              products.map(product => {
                const productId = product[0].product.id;
                const productPrice = product[0].product.price;
                const title = product[0].product.title;
                const quantity = product[4].quantity;
                const productColor = product[2].color;
                const productSize = product[1].size;
                expressCheckoutPurchasedProducts.push({
                  productId,
                  title,
                  productPrice,
                  quantity,
                  productColor,
                  productSize
                });
              });

              const data = {
                payment_method: paymentIntent,
                currency: "usd",
                status: "new",
                shipping_details: shippingDetails,
                products: expressCheckoutPurchasedProducts,
                contact_info: {
                  email: ev.payerEmail,
                  phone: ev.payerPhone
                },
                expressCheckoutPurchase: true,
                user: firebase.auth().currentUser.uid
              };

              firebase
                .firestore()
                .collection("stripe_customers")
                .doc(userUID)
                .collection("payments")
                .add(data)
                .then(docRef => {
                  // SUCCESS PUSH TO DASHBOARD
                  console.log("SUCCESS PUSH TO DASHBOARD");
                })
                .catch(err => {
                  alert(err);
                });
                  // The payment has succeeded.
              }
                // console.log('REQUIRED ACTION')
            } else {
              const shippingDetails = {
                name: ev.payerName,
                address: {
                  line1: ev.shippingAddress.addressLine,
                  postal_code: ev.shippingAddress.postalCode,
                  city: ev.shippingAddress.city,
                  state: ev.shippingAddress.region,
                  country: ev.shippingAddress.country
                }
              };

              let expressCheckoutPurchasedProducts = [];
              products.map(product => {
                const productId = product[0].product.id;
                const productPrice = product[0].product.price;
                const title = product[0].product.title;
                const quantity = product[4].quantity;
                const productColor = product[2].color;
                const productSize = product[1].size;
                expressCheckoutPurchasedProducts.push({
                  productId,
                  title,
                  productPrice,
                  quantity,
                  productColor,
                  productSize
                });
              });

              const data = {
                payment_method: paymentIntent,
                currency: "usd",
                status: "new",
                shipping_details: shippingDetails,
                products: expressCheckoutPurchasedProducts,
                contact_info: {
                  email: ev.payerEmail,
                  phone: ev.payerPhone
                },
                expressCheckoutPurchase: true,
                user: firebase.auth().currentUser.uid
              };

              firebase
                .firestore()
                .collection("stripe_customers")
                .doc(userUID)
                .collection("payments")
                .add(data)
                .then(docRef => {
                  //////////////
                  //// TODO ////
                  // SUCCESS PUSH TO DASHBOARD
                  console.log("SUCCESS PUSH TO DASHBOARD");
                })
                .catch(err => {
                  alert(err);
                });
              }
            }
            setExpressCheckoutPaymentSubmitting(false);
            // tester = false

          // })
          // .catch(err => {
          //   //////////////
          //   //// TODO ////
          //   console.log(err);
          // });
      });
    }
  }, [ activeDiscount, stripe, expressCheckoutPaymentSubmitting, setExpressCheckoutPaymentSubmitting]);


  // console.log(discountTester)
  const { products } = useContext(CartContext);

  if (products.length < 1) {
    return <Redirect to="/" />;
  }

  useEffect(() => {
    const rootElement = document.getElementById("app-container");
    const navbarElement = document.getElementById("navbar-wrapper-id");

    rootElement.classList.toggle("no-scroll-margin");
    navbarElement.classList.toggle("hidden-nav");

    rootElement.scrollIntoView(
      {
        behavior: "smooth",
        block: "start"
      },
      500
    );

    if (userUID.length === 0) {
      setUserUID(firebase.auth().currentUser.uid);
    }

    const subtotal = products.reduce((accum, currentVal) => {
      return (accum += currentVal[4].quantity * currentVal[0].product.price);
    }, 0);

    setSubtotal(subtotal);
  }, [products]);

  // Handle card actions like 3D Secure
  async function handleCardAction(payment, docId) {
    const { error, paymentIntent } = await stripe.handleCardAction(
      payment.client_secret
    );
    if (error) {
      alert(error.message);
      payment = error.payment_intent;
    } else if (paymentIntent) {
      payment = paymentIntent;
    }

    await firebase
      .firestore()
      .collection("stripe_customers")
      .doc(userUID)
      .collection("payments")
      .doc(docId)
      .set(payment, { merge: true });
  }

  const handleCheckoutPurchase = async ev => {
    ev.preventDefault();

    const errors = [];
    if (!billingAddress) {
      errors.push(setNoBillingAddressSelected);
    }

    if (!paymentMethod) {
      errors.push(setNoPaymentMethodSelected);
    }

    if (email.length === 0) {
      errors.push(setNoEmail);
    }

    if (phone.length === 0) {
      errors.push(setNoPhoneNumber);
    }

    if (errors.length > 0) {
      errors.map(err => {
        return err(true);
      });
    } else {
      const shippingDetails = {
        name: billingAddress.name,
        address: {
          line1: billingAddress.address.line1,
          line2: billingAddress.address.line2,
          postal_code: billingAddress.address.postal_code,
          city: billingAddress.address.city,
          state: billingAddress.address.state,
          country: billingAddress.address.country.split(",")[1]
        }
      };

      let test = [];
      products.map(product => {
        const productId = product[0].product.id;
        const productPrice = product[0].product.price;
        const title = product[0].product.title;
        const quantity = product[4].quantity;
        const productColor = product[2].color;
        const productSize = product[1].size;
        test.push({
          productId,
          title,
          productPrice,
          quantity,
          productColor,
          productSize
        });
      });

      const data = {
        payment_method: paymentMethod,
        currency: "usd",
        status: "new",
        shipping_details: shippingDetails,
        products: test,
        contact_info: {
          email,
          phone
        },
        discount: activeDiscount,
        expressCheckoutPurchase: false,
        user: firebase.auth().currentUser.uid
      };

      firebase
        .firestore()
        .collection("stripe_customers")
        .doc(userUID)
        .collection("payments")
        .add(data)
        .then(docRef => {
          docRef.onSnapshot(snapshot => {
            const data = snapshot.data();

            if (data.status === "succeeded") {
              //IF SUCCESS PUSH TO PURCHASE DASHBOARD
            } else if (data.status === "requires_action") {
              handleCardAction(data, docRef.id);
            } else if (data.error) {
              alert(data.error);
            }
          });
        })
        .catch(err => {
          alert(err);
        });
    }
  };

  const handleOpeningInnerContent = (wrapper, plusMinus) => {
    const el = document.getElementById(wrapper);
    const el2 = document.getElementById(`${plusMinus}1`);
    const el3 = document.getElementById(`${plusMinus}2`);

    if (wrapper === "checkout-contact-info-wrapper") {
      el.classList.toggle("transform-add-contact-info-inner-content");
    }

    if (el2 !== null && el3 !== null) {
      el2.classList.toggle("rotating-plus-minus-rotated-tester");
      el3.classList.toggle("rotating-plus-minus-rotated-tester-1");
    }
  };

  const handleSuccessfulPayPalPayment = async ev => {
    const shippingDetails = {
      name: ev.purchase_units[0].shipping.name.full_name,
      address: {
        line1: ev.purchase_units[0].shipping.address.address_line_1,
        postal_code: ev.purchase_units[0].shipping.address.postal_code,
        city: ev.purchase_units[0].shipping.address.admin_area_2,
        state: ev.purchase_units[0].shipping.address.admin_area_1,
        country: ev.purchase_units[0].shipping.address.country_code
      }
    };

    let expressCheckoutPurchasedProducts = [];
    products.map(product => {
      const productId = product[0].product.id;
      const productPrice = product[0].product.price;
      const title = product[0].product.title;
      const quantity = product[4].quantity;
      const productColor = product[2].color;
      const productSize = product[1].size;
      expressCheckoutPurchasedProducts.push({
        productId,
        title,
        productPrice,
        quantity,
        productColor,
        productSize
      });
    });

    const data = {
      payment_method: ev.purchase_units[0].payments.captures[0].id,
      currency: "usd",
      status: "new",
      shipping_details: shippingDetails,
      products: expressCheckoutPurchasedProducts,
      contact_info: {
        email: ev.payer.email_address,
        phone: ""
      },
      expressCheckoutPurchase: true,
      user: firebase.auth().currentUser.uid
    };

    await firebase
      .firestore()
      .collection("stripe_customers")
      .doc(userUID)
      .collection("payments")
      .add(data)
      .then(docRef => {
        //////////////
        //// TODO ////
        // SUCCESS PUSH TO DASHBOARD
        console.log("SUCCESS PUSH TO DASHBOARD");
      });
  };

  const handleAddDiscountClick = () => {
    let deconstructedProducts = [];
    products.map(product => {
      const productId = product[0].product.id;
      const productPrice = product[0].product.price;
      const title = product[0].product.title;
      const quantity = product[4].quantity;
      const productColor = product[2].color;
      const productSize = product[1].size;
      return deconstructedProducts.push({
        productId,
        title,
        productPrice,
        quantity,
        productColor,
        productSize
      });
    });

    const data = {
      discount: discount.toUpperCase(),
      user: firebase.auth().currentUser.uid,
      products: deconstructedProducts
    };

    if (discount.length > 0) {
      const checkAndApplyDiscount = firebase
        .functions()
        .httpsCallable("discountBeingApplied");
      checkAndApplyDiscount(data)
        .then(async result => {
          const { usable, error } = result.data;

          if (usable) {
            setTesterState(true)
            setActiveDiscount(result.data);
          } else {
            console.log(error);
          }
        })
        .catch(err => {
          console.log(err);
        });
    }
  };
  
    const handleCollapsableOrderSummaryClick = () => {
    setCollapsableOrderSummaryOpen(!collapsableOrderSummaryOpen)
  }

  useEffect(() => {
    const el4 = document.getElementById("order-summary-rotating-chevron")
      if (!collapsableOrderSummaryOpen) {
        if (el4 !== null && el4.classList.contains("order-summary-rotating-chevron-rotated")) {
          el4.classList.toggle("order-summary-rotating-chevron-rotated")
          setOrderSummaryHidden(!orderSummaryHidden)
        }
        setCollapsableOrderSummaryMaxHeight(101)
      } else {
        let mobileDiscountHeight = window.document.body.clientWidth <= 450 ? 65 : 0 
        const newMaxHeight = (mobileDiscountHeight + 440.5) + (products.length * 181);
        if (el4 !== null && !el4.classList.contains("order-summary-rotating-chevron-rotated")) {
          el4.classList.toggle("order-summary-rotating-chevron-rotated")
          setOrderSummaryHidden(!orderSummaryHidden)
        }
        setCollapsableOrderSummaryMaxHeight(newMaxHeight)
      }
  }, [ collapsableOrderSummaryOpen ])

  return (
    <div className="checkout-container" id="checkout-container">
      <div className="checkout-banner-image-wrapper" style={{ maxHeight: "200px" }}>
        <img
          className="checkout-banner-image"
          src="https://via.placeholder.com/1900x646"
          alt="bannerImage"
        />
      </div>

      <div className="checkout-wrapper">
        {
          window.document.body.clientWidth <= 1024 ? (
            <div
              id="checkout-order-summary-collapsable-container"
              className="checkout-order-summary-collapsable-container"
              // id="checkout-shipping-methods-wrapper"
              // className="checkout-shipping-methods-wrapper"
              style={{
                height: "100%",
                maxHeight: `${collapsableOrderSummaryMaxHeight}px`,
                // marginTop: "40px",
                overflow: "hidden",
                padding: "40px 0px",
                // paddingTop: "20px",
                // paddingBottom: "20px",
                // borderTop: "1px solid #CCC",
                borderBottom: "1px solid #CCC",
                width: "100%",
                transition: "max-height 0.7s"
              }}
              >
              <div
                onClick={handleCollapsableOrderSummaryClick}
                className="checkout-collapsable-order-summary-header-wrapper"
                style={{
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: "0px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex" }}>
                  <FontAwesomeIcon icon={["fas", "shopping-cart"]} />

                  <div className="checkout-collapsable-order-summary-heading" style={{ paddingLeft: "20px", display: "flex", alignItems: "center" }}>
                    {
                      orderSummaryHidden ? (
                        "Show order summary"
                      ) : (
                        "Hide order summary"
                      )
                    }
                    
                    <div style={{ marginLeft: "10px", display: "flex", transition: "transform 0.7s" }} id="order-summary-rotating-chevron" className="order-summary-rotating-chevron">
                     <FontAwesomeIcon icon={["fas", "chevron-down"]} />
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: "500" }}>
                  ${subtotal}
                </div>
              </div>

              <OrderSummary products={products} setDiscount={setDiscount} handleAddDiscountClick={handleAddDiscountClick} subtotal={subtotal} activeDiscount={activeDiscount} includeShipping={false} />
            </div>
          ) : null
        }

        <div className="checkout-left-column">
          <div className="checkout-express-checkout-wrapper">
            <div className="checkout-express-checkout-header-wrapper">
              <span className="checkout-express-checkout-header-border checkout-express-checkout-header-border-left"></span>
              <span className="checkout-express-checkout-header">
                Express Checkout
              </span>
              <span className="checkout-express-checkout-header-border checkout-express-checkout-header-border-right"></span>
            </div>

            <div className="checkout-express-checkout-btns-wrapper">
              {paymentRequest ? (
                <div className="checkout-express-checkout-btn-wrapper">
                  <PaymentRequestButtonElement
                    options={{ paymentRequest }}
                    id="checkout-payment-request-button-element"
                  />
                </div>
              ) : null}

              <div className="checkout-express-checkout-btn-wrapper checkout-express-checkout-btn-wrapper-paypal">
                <PaypalBtn
                  options={{
                    disableFunding: "credit,card,venmo",
                    clientId:
                      "Ad5t87C5PSZBkusJGq_zTh83uFWQDc9-FPzrxh13HNVTqgCAy6vYA76v4DkjrBeWFNxnI2pOXaMDcTEx"
                  }}
                  amount={subtotal < 100 ? subtotal + 6 : subtotal}
                  currency={"USD"}
                  onSuccess={ev => handleSuccessfulPayPalPayment(ev)}
                />
              </div>
            </div>
          </div>

          <div className="checkout-options-seperator-wrapper">
            <span className="checkout-options-seperator-border"></span>
            <span className="checkout-options-seperator-header">OR</span>
            <span className="checkout-options-seperator-border"></span>
          </div>

          <AddShippingAddressForm
            noBillingAddresses={noBillingAddresses}
            setNoBillingAddresses={(val) => setNoBillingAddresses(val)}
            billingAddresses={billingAddresses}
            setBillingAddresses={(val) => setBillingAddresses(val)}
          />

          <AddPaymentMethodForm 
            noPaymentMethods={noPaymentMethods}
            setNoPaymentMethods={(val) => setNoPaymentMethods(val)}
            paymentMethods={paymentMethods}
            setPaymentMethods={(val) => setPaymentMethods(val)}
          />

        <div style={{ paddingTop: "40px" }}>
            <ChooseShippingAddress
              setNoBillingAddressSelected={(val) => setNoBillingAddressSelected(val)}
              billingAddresses={billingAddresses}
              setBillingAddresses={(val) => setBillingAddresses(val)}
              setBillingAddress={(val) => setBillingAddress(val)}
              noBillingAddressSelected={noBillingAddressSelected}
              noBillingAddresses={noBillingAddresses}
              billingAddress={billingAddress}
            />
          </div>

          <div style={{ paddingTop: "40px" }}>
            <ChoosePaymentMethod
              noPaymentMethods={noPaymentMethods}
              setNoPaymentMethods={(val) => setNoPaymentMethods(val)}
              paymentMethods={paymentMethods}
              setPaymentMethods={(val) => setPaymentMethods(val)}
              setPaymentMethod={(val) => setPaymentMethod(val)}
              paymentMethod={paymentMethod}
              noPaymentMethods={noPaymentMethods}
              noPaymentMethodSelected={noPaymentMethodSelected}

            />
          </div>

          <div
            id="checkout-contact-info-wrapper"
            className="checkout-contact-info-wrapper"
            style={{
              marginTop: "40px",
              height: "100%",
              maxHeight: "62px",
              overflow: "hidden",
              paddingBottom: "40px",
              borderBottom: "1px solid #CCC",
              width: "100%",
              transition: "max-height 0.7s"
            }}
          >
            <div
              onClick={() =>
                handleOpeningInnerContent(
                  "checkout-contact-info-wrapper",
                  "contact-info-rotating-thinger-"
                )
              }
              style={{
                cursor: "pointer",
                fontSize: "18px",
                padding: "0px 20px",
                paddingBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div
                className="shipping-toggle-header"
                style={{ display: "flex" }}
              >
                Contact information
                <div style={{ paddingLeft: "15px", color: "#FF0000" }}>
                  {noEmail &&
                  noPhoneNumber &&
                  phone.length === 0 &&
                  email.length === 0
                    ? "* Required"
                    : (noEmail && email.length === 0) ||
                      (noPhoneNumber && phone.length === 0)
                    ? "* Incomplete"
                    : null}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  width: "12px"
                }}
              >
                <div
                  id="contact-info-rotating-thinger-1"
                  className="rotating-thing-1"
                  style={{
                    top: "-11px",
                    position: "absolute",
                    transform: "rotate(90deg)",
                    transition: "0.7s"
                  }}
                >
                  |
                </div>

                <div
                  id="contact-info-rotating-thinger-2"
                  className="rotating-thing-2"
                  style={{
                    left: "2px",
                    top: "-10px",
                    position: "absolute",
                    transform: "rotate(180deg)",
                    width: "5px",
                    transition: "0.7s"
                  }}
                >
                  |
                </div>
              </div>
            </div>

            <div className="checkout-contact-info-input-wrapper">
              <input
                className="checkout-input"
                placeholder="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="checkout-contact-info-phone-input-wrapper">
              <input
                className="checkout-input"
                placeholder="Phone"
                type="tel"
                value={phone.replace(
                  /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
                  "($1) $2-$3"
                )}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="checkout-left-column-btns-wrapper">
            <Link
              className="checkout-left-column-left-link"
              to="/"
              onClick={() => {
                const rootElement = document.getElementById("app-container");
                const navbarElement = document.getElementById(
                  "navbar-wrapper-id"
                );

                rootElement.classList.toggle("no-scroll-margin");
                navbarElement.classList.toggle("hidden-nav");
              }}
            >
              <span className="checkout-left-column-link-icon">
                <FontAwesomeIcon icon="arrow-left" />
              </span>{" "}
              Return to home
            </Link>

            <div>
              <button
                className="checkout-left-column-right-link"
                to="/checkout/payment"
                style={{
                  display: "flex",
                  justifyContent: "space-evenly",
                  height: "45px",
                  padding: "0 2rem",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={handleCheckoutPurchase}
                // disabled={stripe}
              >
                <div>Purchase</div>
              </button>
            </div>
          </div>
        </div>

        {
          window.document.body.clientWidth > 1024 ? (
            <OrderSummary products={products} setDiscount={setDiscount} handleAddDiscountClick={handleAddDiscountClick} subtotal={subtotal} activeDiscount={activeDiscount} includeShipping={true} />
          ) : null
        }
      </div>
    </div>
  );
};
