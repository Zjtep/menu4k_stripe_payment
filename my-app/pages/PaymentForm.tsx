import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import { doc, getDoc } from 'firebase/firestore';

export default function PaymentForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [subscribed, setSubscribed] = useState(false);
    const [subId, setSubId] = useState('');
    const [customerId, setcustomerId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();

    //  fetch data from firestore

    useEffect(() => {
        const fetchUserData = async () => {
            const userRef = doc(db, 'users', auth.currentUser?.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                setEmail(docSnap.data().email);
                setSubscribed(docSnap.data().subscribed);
                setSubId(docSnap.data().subId);
                setcustomerId(docSnap.data().customerId);
            } else {
                console.log("No such document!");
            }
        };

        fetchUserData();
    }, [db]);

    //  logout

    const logout = () => {
        signOut(auth);
        router.push('/');
    };

    //  susbcribe or update subscription

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        console.log({ email })
        if (subscribed) {
            // Call API endpoint to update the subscription
            try {

                const NumQuantity = Number(quantity);


                const response = await axios.post('/api/update', {
                    email,
                    subId,
                    quantity: NumQuantity
                });

                if (response.data.error) {
                    setErrorMessage(response.data.error.message);
                } else {
                    console.log('Subscription updated');
                    setErrorMessage('Subscription updated successfully')
                }
            } catch (error) {
                console.error('Error updating subscription:', error);
                setErrorMessage('Failed to update subscription.');
            }
        } else {
            if (!stripe || !elements) {
                return;
            }

            const cardElement = elements.getElement(CardElement);

            try {
                //  creating payment method
                const { paymentMethod } = await stripe.createPaymentMethod({
                    type: 'card',
                    card: cardElement,
                });


                console.log({ paymentMethod })

                //  convert quantity string to number 
                const NumQuantity = Number(quantity);

                // calling api to creating subscription and customer 
                const response = await axios.post('/api/sub', {
                    paymentMethod,
                    email,
                    quantity: NumQuantity

                });



                if (response.data.error) {
                    // Handle error here
                    console.log(response.data.error.message);
                }
                const clientSecret = response.data.clientSecret

                //  payment infos of bank

                const { paymentIntent, error } = await stripe.confirmAcssDebitPayment(
                    clientSecret,
                    {
                        payment_method: {
                            billing_details: {
                                name,
                                email,
                            },
                        },
                    }
                );


                if (error) {
                    // Inform the customer that there was an error.
                    console.log(error.message);
                } else {
                    console.log("PaymentIntent ID: " + paymentIntent.id);
                    console.log("PaymentIntent status: " + paymentIntent.status);

                    console.log('succeded')

                }


            } catch (err) {

                console.log(err)
                setErrorMessage('Payment failed')
                return
            }
        }
    };


    //   redirecting to the customer portal

    const handleManageSubscription = async () => {
        try {
            // Assuming you have a customerId stored in Firestore or similar

            const response = await axios.post('/api/customerPortal', { customerId });
            if (response.data.url) {
                window.location.href = response.data.url; // Redirect to the customer portal
            }
        } catch (error) {
            console.error('Error accessing customer portal:', error);
            setErrorMessage('Failed to access subscription management.');
        }
    };

    // handle quantity change 

    const handleChange = (event: any) => {
        setQuantity(event.target.value);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 flex flex-col items-center justify-center h-screen">
            <div className="mb-4">
                <button onClick={logout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Sign out</button>
            </div>

            <div className='mb-6 w-full max-w-xs'>
                {!subscribed && (
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                    </div>
                )}

                <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                    <input type="text" id="email" value={email} readOnly className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>

                <div className="mb-4">
                    <label htmlFor="licenseQuantity" className="block text-gray-700 text-sm font-bold mb-2">Number of Licenses:</label>
                    <select name="licenseQuantity" id="licenseQuantity" value={quantity} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                        {[...Array(10)].map((_, index) => (
                            <option key={index} value={index + 1}>
                                {index + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <p className="text-gray-600">Selected Quantity: {quantity}</p>

                {!subscribed && (
                    <div className="mb-4  w-full">
                        <CardElement className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" />
                    </div>
                )}

                <button type="submit" disabled={!stripe} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    {subscribed ? 'Update Subscription' : 'Pay'}
                </button>



                {subscribed && (
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={handleManageSubscription}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Manage Subscription
                        </button>
                    </div>
                )}

                {errorMessage && <p className="text-red-500">{errorMessage}</p>}


            </div>
        </form>
    );
}
