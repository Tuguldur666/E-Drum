const axios = require("axios");
const asyncHandler = require("express-async-handler");

const sendMessage = asyncHandler(async (phoneNumber, message, authType) => {
  const fullNumber = phoneNumber.startsWith('+') ? phoneNumber : `+976${phoneNumber}`;

  try {
    const result = await axios.get(process.env.MESSAGE_API, {
      params: {
        key: process.env.MESSAGE_KEY,
        text: `${message} is your confirmation code for VIOT`,
        to: fullNumber,
        from: process.env.MESSAGE_PHONE_1,
      },
    });

    // Check if the result status is 'SUCCESS'
    const success = result.data[0].Result === "SUCCESS";

    if (!success) {
      console.error(`Failed to send message to ${fullNumber}: ${result.data[0].ErrorMessage}`);
    }

    return success;

  } catch (err) {
    // Log the full error object for easier debugging
    console.error("SendMessage error:", err.response ? err.response.data : err.message);

    // Return false in case of an error
    return false;
  }
});

module.exports = { sendMessage };
