("use strict");
const stripe = require("stripe")(process.env.STRIPE_KEY);
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { courses } = ctx.request.body;
    try {
      const lineItems = await Promise.all(
        courses.map(async (course) => {
          const item = await strapi
            .service("api::course.course")
            .findOne(course.id);

          return {
            price_data: {
              currency: "inr",
              product_data: {
                name: item.Title,
              },
              unit_amount: Math.round(item.Price * 100),
            },
            quantity: 1,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: { allowed_countries: ["IN"] },
        payment_method_types: ["card"],
        mode: "payment",
        success_url: process.env.CLIENT_URL + "/success?success=true",
        cancel_url: process.env.CLIENT_URL + "/success?success=false",
        line_items: lineItems,
      });

      await strapi
        .service("api::order.order")
        .create({ data: { courses, stripeId: session.id } });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));

