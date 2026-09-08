exports.success = (data, meta = undefined) => {
  return {
    success: true,
    data,
    meta,
  };
};

exports.error = (code, message, details = [], requestId = undefined) => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId,
  };
};
