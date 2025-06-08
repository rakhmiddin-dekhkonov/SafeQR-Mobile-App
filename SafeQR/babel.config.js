module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"], // Keep only this preset
  };
};
