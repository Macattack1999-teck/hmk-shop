import React, { useEffect, useState, useContext } from 'react';
import CartContext from '../../Contexts/CartContext';
import CountryDropdown from './CountryDropdown';
import { Link, Redirect } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Shipping from '../Utilities/Shipping';
import Payment from './Payment';
import { firestore } from '../../Config/fbConfig'
import 'firebase/auth'
import firebase from 'firebase/app';
import 'firebase/functions'
import {CardElement, useElements, useStripe, PaymentRequestButtonElement} from '@stripe/react-stripe-js';
// import axios from 'axios'


export default () => {
  // TODO Add Free Shipping Logic On Orders Over $100
  // Todo Add Logic To Add Discount
  const [ email, setEmail ] = useState("")
  const [ firstName, setFirstName ] = useState("")
  const [ lastName, setLastName ] = useState("")
  const [ address, setAddress ] = useState("")
  const [ address2, setAddress2 ] = useState("")
  const [ city, setCity ] = useState("")
  const [ region, setRegion ] = useState([])
  const [ state, setState ] = useState("")
  const [ zip, setZip ] = useState("")
  const [ noFirstNameErr, setNoFirstNameErr ] = useState(false)
  const [ noLastNameErr, setNoLastNameErr ] = useState(false)
  const [ noAddressErr, setNoAddressErr ] = useState(false)
  const [ noCityErr, setNoCityErr ] = useState(false)
  const [ noRegionErr, setNoRegionErr ] = useState(false)
  const [ noStateErr, setNoStateErr ] = useState(false)
  const [ noZipErr, setNoZipErr ] = useState(false)
  const [ phone, setPhone ] = useState("")
  const [ subtotal, setSubtotal ] = useState(0)
  const [ cardholderName, setCardholderName ] = useState("")
  const [ customerData, setCustomerData ] = useState({})
  const [ billingAddresses, setBillingAddresses ] = useState([])
  const [ billingAddress, setBillingAddress ] = useState(false)
  const [ activeBillingAddress, setActiveBillingAddress ] = useState(false)
  const [ loadingPaymentMethods, setLoadingPaymentMethods ] = useState(true);
  const [ noBillingAddresses, setNoBillingAddresses ] = useState(false)
  const [ getPaymentMethodsError, setGetPaymentMethodsError ] = useState(false)
  const [ userUID, setUserUID ] = useState("");
  const [ paymentMethods, setPaymentMethods ] = useState([]);
  const [ paymentMethod, setPaymentMethod ] = useState(false)
  const [ getBillingAddressesError, setGetBillingAddressesError ] = useState(false)
  const [ loadingBillingAddresses, setLoadingBillingAddresses ] = useState(true)
  const [ noBillingAddressSelected, setNoBillingAddressSelected ] = useState(false)
  const [ noPaymentMethodSelected, setNoPaymentMethodSelected ] = useState(false)
  const [ noEmail, setNoEmail ] = useState(false)
  const [ noPhoneNumber, setNoPhoneNumber ] = useState(false)
  const [ noPaymentMethods, setNoPaymentMethods ] = useState(false)
  const [ activePaymentMethod, setActivePaymentMethod ] = useState(false)
  const [ paymentRequest, setPaymentRequest ] = useState(null)
  const [ expressCheckoutPaymentIntent, setExpressCheckoutPaymentIntent ] = useState(null)
  const stripe = useStripe();
  const elements = useElements();

  if (paymentRequest && expressCheckoutPaymentIntent) {
    console.log('HIT CONDITIONAL')
    paymentRequest.on('token', async (ev) => {
      console.log(ev.token.id)
      const {paymentIntent, error: confirmError} = await stripe.confirmCardPayment(
        expressCheckoutPaymentIntent.data.client_secret,
        {payment_method: ev.token.id},
        {handleActions: false}
      );
    
      if (confirmError) {
        console.log('ERROR')
        // Report to the browser that the payment failed, prompting it to
        // re-show the payment interface, or show an error message and close
        // the payment interface.
        ev.complete('fail');
      } else {
        // Report to the browser that the confirmation was successful, prompting
        // it to close the browser payment method collection interface.
        console.log('SUCCESS')
        ev.complete('success');
        // Check if the PaymentIntent requires any actions and if so let Stripe.js
        // handle the flow. If using an API version older than "2019-02-11" instead
        // instead check for: `paymentIntent.status === "requires_source_action"`.
        if (paymentIntent.status === "requires_action") {
          // Let Stripe.js handle the rest of the payment flow.
          // const {error} = await stripe.confirmCardPayment(expressCheckoutPaymentIntent.client_secret);
          // if (error) {
          //   console.log('ERROR')
          //   // The payment failed -- ask your customer for a new payment method.
          // } else {
          //   console.log('SUCCESS')
          //   // The payment has succeeded.
          // }
          console.log('REQUIRED ACTION')
        } else {
          console.log('SUCCESS')
          // The payment has succeeded.
        }
      }
    });
  }

  const {
    products
  } = useContext(CartContext)

  if (products.length < 1) {
    return <Redirect to="/" />
  }

  useEffect(() => {
    const rootElement = document.getElementById('app-container')
    const navbarElement = document.getElementById('navbar-wrapper-id')
    
    rootElement.classList.toggle('no-scroll-margin')
    navbarElement.classList.toggle('hidden-nav')
    
    rootElement.scrollIntoView({
      behavior: "smooth",
      block: "start"
    }, 500)
    
    if (userUID.length === 0) {
      setUserUID(firebase.auth().currentUser.uid);
    }

    const subtotal = products.reduce((accum, currentVal) => {
      return accum += currentVal[4].quantity * currentVal[0].product.price
    }, 0)
    
    setSubtotal(subtotal)

    if (firebase.auth().currentUser.uid) {
      firestore.collection('stripe_customers').doc(firebase.auth().currentUser.uid).get().then((resp) => {
        setCustomerData(resp.data())
      }).catch((err) => {
        console.log(err)
      })
    }

    if (stripe) {
      const paymentRequest = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Demo total',
          amount: 1099,
        },
      
        requestShipping: true,
        // `shippingOptions` is optional at this point:
        shippingOptions: [
          // The first shipping option in this list appears as the default
          // option in the browser payment interface.
          {
            id: 'free-shipping',
            label: 'Free shipping',
            detail: 'Arrives in 5 to 7 days',
            amount: 0,
          },
        ],
      });

      // Check the availability of the Payment Request API.
      paymentRequest.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(paymentRequest);
        }
      });

      let test = []
      products.map((product) => {
        const productId = product[0].product.id
        const productPrice = product[0].product.price
        const title = product[0].product.title
        const quantity = product[4].quantity
        const productColor = product[2].color
        const productSize = product[1].size
        test.push({ productId, title, productPrice, quantity, productColor, productSize })
      })
  
      const data = {
        products: test
      }
  
      const createExpressCheckoutPaymentIntent = firebase.functions().httpsCallable('createExpressCheckoutPaymentIntent');
      createExpressCheckoutPaymentIntent(data).then((result) => {
        setExpressCheckoutPaymentIntent(result)
      }).catch((err) => {
        console.log(err)
      })
    }
  }, [products, stripe])

  const handleAddPaymentMethod = async (ev) => {
    ev.preventDefault();

    const { setupIntent, error } = await stripe.confirmCardSetup(
      customerData.setup_secret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: cardholderName,
          },
        },
      }
    );

    if (error) {
      console.log(error)
      return;
    }

    firebase
    .firestore()
    .collection('stripe_customers')
    .doc(userUID)
    .collection('payment_methods')
    .add({ id: setupIntent.payment_method })
    .then((resp) => {
        resp.onSnapshot({
          // Listen for document metadata changes
          includeMetadataChanges: true
      }, (doc) => {
        if (doc.data().card) {
          if (noPaymentMethods) {
            setNoPaymentMethods(false)
          }
        
          const currentState = paymentMethods
          currentState.push(doc.data());
          setPaymentMethods([...currentState])
        }
      });
    })
  }

  const handleGettingPaymentMethods = () => {
    firestore
      .collection('stripe_customers')
      .doc(firebase.auth().currentUser.uid)
      .collection('payment_methods')
      .get()
      .then((snapshot) => {
        if (snapshot.metadata.fromCache) {
          setGetPaymentMethodsError(true)
        } else {
          if (snapshot.empty) {
            setNoPaymentMethods(true)
          } else if (paymentMethods.length !== snapshot.size) {
            const currentState = paymentMethods
            snapshot.forEach((doc) => {
              currentState.push(doc.data())
            })
  
            setPaymentMethods([...currentState])
          }
        }
     
        setLoadingPaymentMethods(false)
      })
    
    // console.log(getPaymentMethodsError)
    
    const handleUsePaymentClick = (paymentMethod, paymentMethodIdx) => {
      return setPaymentMethod(paymentMethod.id), setActivePaymentMethod(paymentMethodIdx)
    }
    
    const handleOpeningInnerContent = () => {
      const el = document.getElementById('checkout-payment-methods-wrapper')
      const el2 = document.getElementById('rotating-thing-1')
      const el3 = document.getElementById('rotating-thing-2')

      if (paymentMethods.length < 3) {
        el.classList.toggle('transform-inner-content')
      } else {
        el.classList.toggle('transform-inner-content-large')
      }
      el2.classList.toggle('rotating-plus-minus-rotated-tester')
      el3.classList.toggle('rotating-plus-minus-rotated-tester-1')
    }

    const handleScrollToAddPaymentMethodSection = () => {
      const addPaymentMethodElem = document.getElementById('checkout-add-payment-wrapper')
      const addPaymentMethodPlusMinusOne = document.getElementById('add-payment-rotating-thinger-1')
      const addPaymentMethodPlusMinusTwo = document.getElementById('add-payment-rotating-thinger-2')
      addPaymentMethodElem.scrollIntoView({
        block: "center",
        behavior: "smooth"
      })

      setTimeout(() => {
        if (addPaymentMethodElem.classList.contains('transform-add-payment-inner-content') === false) {
          addPaymentMethodElem.classList.toggle('transform-add-payment-inner-content')
          addPaymentMethodPlusMinusOne.classList.toggle('rotating-plus-minus-rotated-tester')
          addPaymentMethodPlusMinusTwo.classList.toggle('rotating-plus-minus-rotated-tester-1')
        }
      }, 300)
    }

    const handleGetPaymentMethodsRetry = () => {
      setLoadingPaymentMethods(true)

      firestore
      .collection('stripe_customers')
      .doc(firebase.auth().currentUser.uid)
      .collection('payment_methods')
      .get()
      .then((snapshot) => {
        if (snapshot.metadata.fromCache) {
          setGetPaymentMethodsError(true)
        } else {
          if (snapshot.empty) {
            setNoPaymentMethods(true)
          } else if (paymentMethods.length !== snapshot.size) {
            const currentState = paymentMethods
            snapshot.forEach((doc) => {
              currentState.push(doc.data())
            })
  
            setPaymentMethods([...currentState])
          }
        }
     
        setLoadingPaymentMethods(false)
      })
    }

    return (
      <div id="checkout-payment-methods-wrapper" id="checkout-payment-methods-wrapper" style={{ height: "100%", maxHeight: "62px", overflow: "hidden", paddingBottom: "40px", borderBottom: "1px solid #CCC", width: "100%", transition: "max-height 0.7s" }}>
        <div onClick={handleOpeningInnerContent} style={{ cursor: "pointer", fontSize: '18px', padding: "0px 20px", paddingBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="shipping-toggle-header" style={{ display: "flex" }}>
            Choose from your payment methods

            <div style={{ paddingLeft: "15px", color: "#FF0000" }}>
              {
                noPaymentMethodSelected && !paymentMethod ? (
                  "* Required"
                ) : null
              }
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "12px" }}>
            <div id="rotating-thing-1" className="rotating-thing-1" style={{ top: "-11px", position: "absolute", transform: "rotate(90deg)", transition: "0.7s" }}>
              |
            </div>

            <div id="rotating-thing-2" className="rotating-thing-2" style={{ left: "2px", top: "-10px", position: "absolute", transform: "rotate(180deg)", width: "5px", transition: "0.7s" }}>
              |
            </div>
          </div>
        </div>

        <div>
          {
            !noPaymentMethods && paymentMethods.length > 0 && !loadingPaymentMethods ? (
              <div>
                {
                  paymentMethods.map((paymentMethod, paymentMethodIdx) => {
                    return (
                      <button 
                        key={paymentMethodIdx}
                        onClick={() => handleUsePaymentClick(paymentMethod, paymentMethodIdx)}
                        style={{ marginTop: "20px", height: "50px", display: "flex", width: "100%", border: "1px solid #1d1d1d", borderRadius: "5px", background: "transparent", padding: "0px", cursor: "pointer" }}
                      >
                        <div style={{ height: "100%", width: "10%", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #1d1d1d" }}>
                          <div style={{ fontSize: "12px" }}>
                            {
                              paymentMethodIdx === activePaymentMethod ? (
                                <FontAwesomeIcon icon={["fas", "circle"]} />
                              ) : (
                                <FontAwesomeIcon icon={["far", "circle"]} />
                              )
                            }
                          </div>
                        </div>

                        <div style={{ height: "100%", width: "90%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", fontSize: "14px" }}>
                          <div style={{ display: "flex" }}>
                            <div style={{ paddingRight: "10px", textTransform: "capitalize" }}>{paymentMethod.card.brand}</div>
                            <div style={{ paddingRight: "10px" }}>****</div>
                            <div>{paymentMethod.card.last4}</div>
                          </div>

                          <div style={{ display: "flex" }}>
                            <div style={{ paddingRight: "10px" }}>Expires</div>
                            <div style={{ paddingRight: "10px" }} >{paymentMethod.card.exp_month}</div>
                            <div style={{ paddingRight: "10px" }}>/</div>
                            <div>{paymentMethod.card.exp_year}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                }
              </div>
            ) : !noPaymentMethods && paymentMethods.length === 0 && getPaymentMethodsError && !loadingPaymentMethods ? (
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center" }}>
              <ul style={{ fontSize: "22px", color: "#FF0000" }}>
                <FontAwesomeIcon icon={["fas", "dizzy"]} />
              </ul>

              <div style={{ paddingLeft: "20px", fontSize: "15px" }}>
                Looks like there was a problem with your internet connection. Click <span onClick={handleGetPaymentMethodsRetry} style={{ cursor: "pointer", textDecorationLine: "underline" }}>here</span> to retry.
              </div>
            </div>
            ) : noPaymentMethods && paymentMethods.length === 0 && !loadingPaymentMethods ? (
              <div style={{ marginTop: "20px", display: "flex" }}>
                <ul style={{ fontSize: "18px", color: "#FF8800" }}>
                  <FontAwesomeIcon icon={["fas", "exclamation-triangle"]} />
                </ul>

                <div style={{ paddingLeft: "20px", fontSize: "15px" }}>
                  You don't have any payment methods, you can add one <span onClick={handleScrollToAddPaymentMethodSection} style={{ cursor: "pointer", textDecorationLine: "underline" }}>here</span>!
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "20px", display: "flex" }}>
                <ul style={{ fontSize: "18px", color: "#CCC" }}>
                  <FontAwesomeIcon icon={["fas", "circle-notch"]} spin={true} />
                </ul>

                <div style={{ paddingLeft: "20px", fontSize: "15px" }}>
                  Loading...
                </div>
              </div>
            )
          }
        </div>
      </div>
    )
  }

  const handleGettingBillingAddresses = () => {
    firestore
      .collection('stripe_customers')
      .doc(firebase.auth().currentUser.uid)
      .collection('billing_addresses')
      .get()
      .then((snapshot) => {
      if (snapshot.metadata.fromCache) {
        setGetBillingAddressesError(true)
      } else { 
        if (snapshot.empty) {
          setNoBillingAddresses(true)
        }

        if (billingAddresses.length !== snapshot.size) {
          const currentState = billingAddresses
          snapshot.forEach((doc) => {
            currentState.push(doc.data())
          })

          setBillingAddresses([...currentState])
        }
      }

      setLoadingBillingAddresses(false)
    })

    const handleUseAddressClick = (billingAddress, billingAddressIdx) => {
      return setBillingAddress(billingAddress), setActiveBillingAddress(billingAddressIdx)
    }

    const handleOpeningInnerContent = () => {
      const el = document.getElementById('checkout-shipping-methods-wrapper')
      const el2 = document.getElementById('rotating-thinger-1')
      const el3 = document.getElementById('rotating-thinger-2')
      if (paymentMethods.length < 3) {
        el.classList.toggle('transform-inner-content')
      } else {
        el.classList.toggle('transform-inner-content-large')
      }
      el2.classList.toggle('rotating-plus-minus-rotated-tester')
      el3.classList.toggle('rotating-plus-minus-rotated-tester-1')
    }

    const handleScrollToAddBillingAddressSection = () => {
      const billingAddressWrapperElem = document.getElementById('checkout-shipping-info-wrapper')
      const billingAddressPlusMinusOne = document.getElementById('shipping-address-rotating-thinger-1')
      const billingAddressPlusMinusTwo = document.getElementById('shipping-address-rotating-thinger-2')
      billingAddressWrapperElem.scrollIntoView({
        block: "center",
        behavior: "smooth"
      })

      setTimeout(() => {
        if (billingAddressWrapperElem.classList.contains('transform-add-shipping-inner-content') === false) {
          billingAddressWrapperElem.classList.toggle('transform-add-shipping-inner-content')
          billingAddressPlusMinusOne.classList.toggle('rotating-plus-minus-rotated-tester')
          billingAddressPlusMinusTwo.classList.toggle('rotating-plus-minus-rotated-tester-1')
        }
      }, 300)
    }

    const handleGetBillingAddressesRetry = () => {
      setLoadingBillingAddresses(true)

      firestore
      .collection('stripe_customers')
      .doc(firebase.auth().currentUser.uid)
      .collection('billing_addresses')
      .get()
      .then((snapshot) => {
      if (snapshot.metadata.fromCache) {
        setGetPaymentMethodsError(true)
      } else { 
        if (snapshot.empty) {
          return setNoBillingAddresses(true)
        }

        if (billingAddresses.length !== snapshot.size) {
          const currentState = billingAddresses
          snapshot.forEach((doc) => {
            currentState.push(doc.data())
          })

          setBillingAddresses([...currentState])
        }
      }

      setLoadingBillingAddresses(false)
      })
    }

    return (
      <div id="checkout-shipping-methods-wrapper" className="checkout-shipping-methods-wrapper" style={{ height: "100%", maxHeight: "62px", overflow: "hidden", paddingBottom: "40px", borderBottom: "1px solid #CCC", width: "100%", transition: "max-height 0.7s" }}>
        <div onClick={handleOpeningInnerContent} style={{ cursor: "pointer", fontSize: '18px', padding: "0px 20px", paddingBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="shipping-toggle-header" style={{ display: "flex" }}>
            Choose from your shipping addresses

            <div style={{ paddingLeft: "15px", color: "#FF0000" }}>
              {
                noBillingAddressSelected && !billingAddress ? (
                  "* Required"
                ) : null
              }
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "12px" }}>
            <div id="rotating-thinger-1" className="rotating-thing-1" style={{ top: "-11px", position: "absolute", transform: "rotate(90deg)", transition: "0.7s" }}>
              |
            </div>

            <div id="rotating-thinger-2" className="rotating-thing-2" style={{ left: "2px", top: "-10px", position: "absolute", transform: "rotate(180deg)", width: "5px", transition: "0.7s" }}>
              |
            </div>
          </div>
        </div>

        <div>
          {
            !noBillingAddresses && billingAddresses.length > 0 ? (
              <div>
                {
                  billingAddresses.map((billingAddress, billingAddressIdx) => {
                    return (
                      <button 
                        key={billingAddressIdx}
                        onClick={() => handleUseAddressClick(billingAddress, billingAddressIdx)}
                        style={{ marginTop: "20px", height: "50px", display: "flex", width: "100%", border: "1px solid #1d1d1d", borderRadius: "5px", background: "transparent", padding: "0px", cursor: "pointer" }}
                      >
                        <div style={{ height: "100%", width: "10%", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #1d1d1d" }}>
                          <div style={{ fontSize: "12px" }}>
                            {
                              billingAddressIdx === activeBillingAddress ? (
                                <FontAwesomeIcon icon={["fas", "circle"]} />
                              ) : (
                                <FontAwesomeIcon icon={["far", "circle"]} />
                              )
                            }
                          </div>
                        </div>

                        <div style={{ height: "100%", width: "90%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", fontSize: "14px" }}>
                          <div style={{ display: "flex" }}>
                            <div style={{ paddingRight: "10px" }}>{billingAddress.address.line1}</div>
                          </div>

                          <div style={{ display: "flex" }}>
                            <div style={{ paddingRight: "10px" }}>{billingAddress.address.state}</div>
                            <div style={{ paddingRight: "10px" }} >{billingAddress.address.postal_code}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                }
              </div>
            ) : !noBillingAddresses && billingAddresses.length === 0 && getBillingAddressesError && !loadingBillingAddresses ? (
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center" }}>
              <ul style={{ fontSize: "22px", color: "#FF0000" }}>
                <FontAwesomeIcon icon={["fas", "dizzy"]} />
              </ul>

              <div style={{ paddingLeft: "20px", fontSize: "15px" }}>
                Looks like there was a problem with your internet connection. Click <span onClick={handleGetBillingAddressesRetry} style={{ cursor: "pointer", textDecorationLine: "underline" }}>here</span> to retry.
              </div>
            </div>
            ) : noBillingAddresses && billingAddresses.length === 0 && !loadingBillingAddresses ? (
              <div style={{ marginTop: "20px", display: "flex" }}>
                <ul style={{ fontSize: "18px", color: "#FF8800" }}>
                  <FontAwesomeIcon icon={["fas", "exclamation-triangle"]} />
                </ul>

                <div style={{ paddingLeft: "20px", fontSize: "15px" }}>
                  You don't have any billing addresses, you can add one <span onClick={handleScrollToAddBillingAddressSection} style={{ cursor: "pointer", textDecorationLine: "underline" }}>here</span>!
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "20px", display: "flex" }}>
                <ul style={{ fontSize: "18px", color: "#CCC" }}>
                  <FontAwesomeIcon icon={["fas", "circle-notch"]} spin={true} />
                </ul>

                <div style={{ paddingLeft: "20px", fontSize: "15px" }}>
                  Loading...
                </div>
              </div>
            )
          }
        </div>
      </div>
    )
  }

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
      .collection('stripe_customers')
      .doc(userUID)
      .collection('payments')
      .doc(docId)
      .set(payment, { merge: true });
  }


  const handleCheckoutPurchase = async (ev) => {
    ev.preventDefault();

    const errors = []
    if (!billingAddress) {
      errors.push(setNoBillingAddressSelected)
    }

    if (!paymentMethod) {
      errors.push(setNoPaymentMethodSelected)
    }

    if (email.length === 0) {
      errors.push(setNoEmail)
    }

    if (phone.length === 0) {
      errors.push(setNoPhoneNumber)
    }

    if (errors.length > 0) {
      errors.map((err) => {
        return err(true)
      })
    } else {
      const shippingDetails = {
        name: billingAddress.name,
        address: {
          line1: billingAddress.address.line1,
          line2: billingAddress.address.line2,
          postal_code: billingAddress.address.postal_code,
          city: billingAddress.address.city,
          state: billingAddress.address.state,
          country: billingAddress.address.country.split(',')[1]
        }
      }
    
      let test = []
      products.map((product) => {
        const productId = product[0].product.id
        const productPrice = product[0].product.price
        const title = product[0].product.title
        const quantity = product[4].quantity
        const productColor = product[2].color
        const productSize = product[1].size
        test.push({ productId, title, productPrice, quantity, productColor, productSize })
      })

      const data = {
        payment_method: paymentMethod,
        currency: 'usd',
        status: 'new',
        shipping_details: shippingDetails,
        products: test,
        contact_info: {
          email,
          phone
        },
        user: firebase.auth().currentUser.uid
      }

      firebase
      .firestore()
      .collection('stripe_customers')
      .doc(userUID)
      .collection('payments')
      .add(data).then((docRef) => {
        docRef.onSnapshot((snapshot) => {
          const data = snapshot.data()

          if (data.status === 'succeeded') {
            //IF SUCCESS PUSH TO PURCHASE DASHBOARD
          } else if (data.status === 'requires_action') {
            handleCardAction(data, docRef.id);
          } else if (data.error) {
            alert(data.error)
          }
        })
      }).catch((err) => {
        alert(err)
      })
    }
  }

  const handleAddShippingAddress = () => {
    const errors = []
    if (address.length === 0) {
      errors.push(setNoAddressErr)
    }

    if (city.length === 0) {
      errors.push(setNoCityErr)
    }

    if (region.length === 0) {
      errors.push(setNoRegionErr)
    }

    if (zip.length === 0) {
      errors.push(setNoZipErr)
    }

    if (state.length === 0) {
      errors.push(setNoStateErr)
    }

    if (firstName.length === 0) {
      errors.push(setNoFirstNameErr)
    }

    if (lastName.length === 0) {
      errors.push(setNoLastNameErr)
    }

    if (errors.length > 0) {
      errors.map((err) => {
        return err(true)
      })
    } else {
      firebase
        .firestore()
        .collection('stripe_customers')
        .doc(userUID)
        .collection('billing_addresses')
        .add({
          name: `${firstName} ${lastName}`,
          address: {
            line1: address,
            line2: address2,
            postal_code: zip,
            city,
            state,
            country: region
          }
        }) .then((resp) => {
          resp.onSnapshot({
            // Listen for document metadata changes
            includeMetadataChanges: true
        }, (doc) => {
          if (noBillingAddresses) {
            setNoBillingAddresses(false)
          }

          const currentState = billingAddresses
          currentState.push(doc.data());
          setBillingAddresses([...currentState])
        });
      }).catch((err) => {
        alert(err)
      })
    }
  }

  const handleOpeningInnerContent = (wrapper, plusMinus) => {
      const el = document.getElementById(wrapper)
      const el2 = document.getElementById(`${plusMinus}1`)
      const el3 = document.getElementById(`${plusMinus}2`)

      if (wrapper === 'checkout-add-payment-wrapper') {
        el.classList.toggle('transform-add-payment-inner-content')
      } else if (wrapper === 'checkout-shipping-info-wrapper') {
        el.classList.toggle('transform-add-shipping-inner-content')
      } else if (wrapper === 'checkout-contact-info-wrapper') {
        el.classList.toggle('transform-add-contact-info-inner-content')
      }
      el2.classList.toggle('rotating-plus-minus-rotated-tester')
      el3.classList.toggle('rotating-plus-minus-rotated-tester-1')
  }

  const cardElementOptions = {
    style: {
      base: {
        
      },
      invalid: {

      },
      complete: {
        
      }
    },
    hidePostalCode: true
  }

  return (
    <div className="checkout-container"  id="checkout-container">
      <div className="checkout-banner-image-wrapper">
        <img
          className="checkout-banner-image"
          src="https://via.placeholder.com/1900x646"
          alt="bannerImage"
        />
      </div>

      <div className="checkout-wrapper">
        <div className="checkout-left-column">
            <div className="checkout-express-checkout-wrapper">
              <div className="checkout-express-checkout-header-wrapper">
                <span className="checkout-express-checkout-header-border checkout-express-checkout-header-border-left"></span>
                <span className="checkout-express-checkout-header">Express Checkout</span>
                <span className="checkout-express-checkout-header-border checkout-express-checkout-header-border-right"></span>
              </div>

              <div className="checkout-express-checkout-btns-wrapper">
                {
                  paymentRequest ? (
                    <div
                      className="checkout-express-checkout-btn-wrapper"
                    >
                      <PaymentRequestButtonElement options={{paymentRequest}} />
                    </div>
                  ) : null
                }


                <div className="checkout-express-checkout-btn-wrapper">
                  <button className="checkout-express-checkout-btn">Paypal</button>
                </div>
              </div>
            </div>

            <div className="checkout-options-seperator-wrapper">
              <span className="checkout-options-seperator-border"></span>
              <span className="checkout-options-seperator-header">OR</span>
              <span className="checkout-options-seperator-border"></span>
            </div>

            <div id="checkout-shipping-info-wrapper" className="checkout-shipping-info-wrapper" style={{ marginTop: "80px", height: "100%", maxHeight: "62px", overflow: "hidden", paddingBottom: "40px", borderBottom: "1px solid #CCC", width: "100%", transition: "max-height 0.7s" }}>
              <div onClick={() => handleOpeningInnerContent('checkout-shipping-info-wrapper', 'shipping-address-rotating-thinger-')} style={{ cursor: "pointer", fontSize: '18px', padding: "0px 20px", paddingBottom: "40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="shipping-toggle-header">
                  Add a shipping address
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "12px" }}>
                  <div id="shipping-address-rotating-thinger-1" className="rotating-thing-1" style={{ top: "-11px", position: "absolute", transform: "rotate(90deg)", transition: "0.7s" }}>
                    |
                  </div>

                  <div id="shipping-address-rotating-thinger-2" className="rotating-thing-2" style={{ left: "2px", top: "-10px", position: "absolute", transform: "rotate(180deg)", width: "5px", transition: "0.7s" }}>
                    |
                  </div>
                </div>
              </div>

              <div className="checkout-shipping-info-name-wrapper">
                <div>
                  <input
                    className="checkout-input"
                    placeholder="First name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  
                  {
                    noFirstNameErr && firstName.length === 0 ? (
                      <div style={{ paddingTop: "10px", color: "#FF0000" }}>
                        * Required
                      </div>
                    ) : null
                  }
                </div>

                <div>
                  <input
                    className="checkout-input"
                    placeholder="Last name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />

                  {
                    noLastNameErr && lastName.length === 0 ? (
                      <div style={{ paddingTop: "10px", color: "#FF0000" }}>
                        * Required
                      </div>
                    ) : null
                  }
                </div>
              </div>

              <div className="checkout-shipping-info-address-one-wrapper  checkout-input-padding">
                <input
                    className="checkout-input"
                    placeholder="Address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />

                  {
                    noAddressErr && address.length === 0 ? (
                      <div style={{ paddingTop: "10px", color: "#FF0000" }}>
                        * Required
                      </div>
                    ) : null
                  }
              </div>

              <div className="checkout-shipping-info-address-two-wrapper checkout-input-padding">
                <input
                    className="checkout-input"
                    placeholder="Apartment, Suite, etc. (optional)"
                    type="text"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                  />
              </div>

              <div className="checkout-shipping-info-city-wrapper checkout-input-padding">
                <input
                    className="checkout-input"
                    placeholder="City"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />

                  {
                    noCityErr && city.length === 0 ? (
                      <div style={{ paddingTop: "10px", color: "#FF0000" }}>
                        * Required
                      </div>
                    ) : null
                  }
              </div>

                <div className="checkout-shipping-info-region-state-city-wrapper checkout-input-padding">
                  <div>
                    <CountryDropdown 
                      setRegion={(country) => setRegion(country)}
                    />

                    {
                      noRegionErr && region.length === 0 ? (
                        <div style={{ paddingTop: "10px", color: "#FF0000" }}>
                          * Required
                        </div>
                      ) : null
                    } 
                  </div>

                  <div>
                    <input
                      className="checkout-input"
                      placeholder="State"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />

                    {
                      noStateErr && state.length === 0 ? (
                        <div style={{ paddingTop: "10px", color: "#FF0000" }}>
                          * Required
                        </div>
                      ) : null
                    }
                  </div>

                  <div>
                    <input
                      className="checkout-input"
                      placeholder="Zip code"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                    />

                    {
                      noZipErr && zip.length === 0 ? (
                        <div style={{ paddingTop: "10px", color: "#FF0000" }}>
                          * Required
                        </div>
                      ) : null
                    }
                  </div>
                </div>

                <div style={{ marginTop: "20px" }}>
                  <button 
                    onClick={handleAddShippingAddress}
                    style={{ padding: "1rem 2rem", border: "none", backgroundColor: "#45b3e0", color: "#1d1d1d", borderRadius: "5px", cursor: "pointer" }}
                  >
                    Add this address
                  </button>
                </div>
            </div>

            <div id="checkout-add-payment-wrapper" style={{ marginTop: "40px", height: "100%", maxHeight: "62px", overflow: "hidden", paddingBottom: "40px", borderBottom: "1px solid #CCC", width: "100%", transition: "max-height 0.7s" }}>
              <div onClick={() => handleOpeningInnerContent('checkout-add-payment-wrapper', 'add-payment-rotating-thinger-')} style={{ cursor: "pointer", fontSize: '18px', padding: "0px 20px", paddingBottom: "40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="shipping-toggle-header">
                  Add a payment method
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "12px" }}>
                  <div id="add-payment-rotating-thinger-1" className="rotating-thing-1" style={{ top: "-11px", position: "absolute", transform: "rotate(90deg)", transition: "0.7s" }}>
                    |
                  </div>

                  <div id="add-payment-rotating-thinger-2" className="rotating-thing-2" style={{ left: "2px", top: "-10px", position: "absolute", transform: "rotate(180deg)", width: "5px", transition: "0.7s" }}>
                    |
                  </div>
                </div>
              </div>

                <div>
                  <input
                    style={{ height: "50px", width: "100%", border: "1px solid #1d1d1d", borderRadius: "5px" }}
                    type="text"
                    className="checkout-input"
                    value={cardholderName}
                    placeholder="Card holder name"
                    onChange={(e) => setCardholderName(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: "20px", height: "50px", width: "100%", border: "1px solid #1d1d1d", borderRadius: "5px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <CardElement
                    options={cardElementOptions} 
                  />
                </div>

                <div style={{ marginTop: "20px" }}>
                  <button 
                    onClick={handleAddPaymentMethod}
                    style={{ padding: "1rem 2rem", border: "none", backgroundColor: "#45b3e0", color: "#1d1d1d", borderRadius: "5px", cursor: "pointer" }}
                  >
                    Add this card
                  </button>
                </div>
            </div>

            <div style={{ paddingTop: "40px" }}>
              {
                handleGettingPaymentMethods()
              }
            </div>

            <div style={{ paddingTop: "40px" }}>
              {
                handleGettingBillingAddresses()
              }
            </div>

            <div id="checkout-contact-info-wrapper" className="checkout-contact-info-wrapper" style={{ marginTop: "40px", height: "100%", maxHeight: "62px", overflow: "hidden", paddingBottom: "40px", borderBottom: "1px solid #CCC", width: "100%", transition: "max-height 0.7s" }}>
              <div onClick={() => handleOpeningInnerContent('checkout-contact-info-wrapper', 'contact-info-rotating-thinger-')} style={{ cursor: "pointer", fontSize: '18px', padding: "0px 20px", paddingBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="shipping-toggle-header" style={{ display: "flex" }}>
                  Contact information

                  <div style={{ paddingLeft: "15px", color: "#FF0000" }}>
                    {
                      noEmail && noPhoneNumber && phone.length === 0 && email.length === 0 ? (
                        "* Required"
                      ) : noEmail && email.length === 0 || noPhoneNumber && phone.length === 0 ? (
                        "* Incomplete"
                      ) : null
                    }
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "12px" }}>
                  <div id="contact-info-rotating-thinger-1" className="rotating-thing-1" style={{ top: "-11px", position: "absolute", transform: "rotate(90deg)", transition: "0.7s" }}>
                    |
                  </div>

                  <div id="contact-info-rotating-thinger-2" className="rotating-thing-2" style={{ left: "2px", top: "-10px", position: "absolute", transform: "rotate(180deg)", width: "5px", transition: "0.7s" }}>
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
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="checkout-contact-info-phone-input-wrapper">
                <input
                  className="checkout-input"
                  placeholder="Phone"
                  type="tel"
                  value={phone.replace(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, '($1) $2-$3')}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="checkout-left-column-btns-wrapper">
              <Link
                className="checkout-left-column-left-link"
                to="/"
                onClick={() => {
                  const rootElement = document.getElementById('app-container')
                  const navbarElement = document.getElementById('navbar-wrapper-id')
                  
                  rootElement.classList.toggle('no-scroll-margin')
                  navbarElement.classList.toggle('hidden-nav')
                }}
              >
                <span className="checkout-left-column-link-icon"><FontAwesomeIcon icon="arrow-left" /></span> Return to home
              </Link>

              <div>
                <button
                  className="checkout-left-column-right-link"
                  to="/checkout/payment"
                  style={{ display: "flex", justifyContent: "space-evenly", padding: "0 3rem", border: "none", cursor: 'pointer' }}
                  onClick={handleCheckoutPurchase}
                  // disabled={stripe}
                >
                  <div>Purchase </div>
                  {/* TODO USE FONT AWESOME ICON BULLET POINT */}
                  <div>${subtotal}</div>
                </button>
              </div>
          </div>
        </div>

        <div className="checkout-right-column-wrapper">
          <div className="checkout-products-wrapper">
            {
              products.map((product, productIdx) => {
                return (
                  <div className="checkout-product-wrapper" key={productIdx}>
                    <div className="checkout-product-image-container">
                      <div className="checkout-product-image-wrapper">
                        <img
                          src={product[3].image}
                          alt="productImage"
                          className="checkout-product-image"
                        />

                        <div className="checkout-product-image-quantity-wrapper">
                          <div className="checkout-product-image-quantity">
                            {product[4].quantity}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="checkout-product-info-wrapper">
                      <div className="checkout-product-title">
                        {product[0].product.title}
                      </div>

                      <div className="checkout-product-color">
                        {product[2].color} / {product[1].size.toUpperCase()}
                      </div>
                    </div>

                    <div className="checkout-product-price">
                      ${product[0].product.price * product[4].quantity}
                    </div>
                  </div>
                )
              })
            }
          </div>

          <div className="checkout-discount-code-wrapper">
            <div className="checkout-discount-input-wrapper">
              <input
                className="checkout-input"
                placeholder="Discount or promo code"
                type="text"
              />
            </div>

            <div className="checkout-discount-btn-wrapper">
              <button
                className="checkout-discount-btn"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="checkout-total-calculations-wrapper">
            <div className="checkout-subtotal-wrapper">
              <div className="checkout-subtotal-header">
                Subtotal
              </div>

              <div className="checkout-subtotal-price">
                ${subtotal}
              </div>
            </div>

            <div className="checkout-shipping-wrapper">
              <div className="checkout-shipping-header">
                Shipping
              </div>

              <div className="checkout-shipping-price">
                { region === 'USA' ? "$6" : region === "" ? "Not calculated yet." : "$8" }
              </div>
            </div>
          </div>

          <div className="checkout-total-wrapper">
            <div className="checkout-total-header">
              Total
            </div>

            <div className="checkout-total-price">
              {region === "USA" ? `$${subtotal + 6}` : region === "" ? "Not calculated yet." : `$${subtotal + 8}`}
            </div>
          </div>

          <div >
            <Shipping paddingReAlign={true} />
          </div>
        </div>
      </div>
    </div>
  )
}