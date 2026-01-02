import { db } from '@/db'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import OrderReceivedEmail from '@/components/emails/OrderReceivedEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      return new Response('Invalid signature', { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
      return new Response('Server configuration error', { status: 500 })
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    if (event.type === 'checkout.session.completed') {
      const customerEmail = event.data.object.customer_details?.email
      if (!customerEmail) {
        throw new Error('Missing user email')
      }

      const session = event.data.object as Stripe.Checkout.Session

      const { userId, orderId } = session.metadata || {
        userId: null,
        orderId: null,
      }

      if (!userId || !orderId) {
        throw new Error('Invalid request metadata')
      }

      const customerDetails = session.customer_details
      const shippingDetails = session.shipping_details

      if (!customerDetails?.address || !shippingDetails?.address) {
        throw new Error('Missing address information')
      }

      const billingAddress = customerDetails.address
      const shippingAddress = shippingDetails.address
      const customerName = customerDetails.name ?? 'Unknown'

      const updatedOrder = await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          isPaid: true,
          shippingAddress: {
            create: {
              name: customerName,
              city: shippingAddress.city ?? '',
              country: shippingAddress.country ?? '',
              postalCode: shippingAddress.postal_code ?? '',
              street: shippingAddress.line1 ?? '',
              state: shippingAddress.state ?? null,
            },
          },
          billingAddress: {
            create: {
              name: customerName,
              city: billingAddress.city ?? '',
              country: billingAddress.country ?? '',
              postalCode: billingAddress.postal_code ?? '',
              street: billingAddress.line1 ?? '',
              state: billingAddress.state ?? null,
            },
          },
        },
      })

      const fromEmail = process.env.FROM_EMAIL ?? 'noreply@example.com'
      const fromName = process.env.FROM_NAME ?? 'YellowMonkey'

      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [customerEmail],
        subject: 'Thanks for your order!',
        react: OrderReceivedEmail({
          orderId,
          orderDate: updatedOrder.createdAt.toLocaleDateString(),
          // @ts-ignore
          shippingAddress: {
            name: customerName,
            city: shippingAddress.city ?? '',
            country: shippingAddress.country ?? '',
            postalCode: shippingAddress.postal_code ?? '',
            street: shippingAddress.line1 ?? '',
            state: shippingAddress.state ?? null,
          },
        }),
      })
    }

    return NextResponse.json({ result: event, ok: true })
  } catch (err) {
    console.error('Webhook processing error:', err instanceof Error ? err.message : 'Unknown error')

    return NextResponse.json(
      { message: 'Something went wrong', ok: false },
      { status: 500 }
    )
  }
}
