const path = require("path")

module.exports = (request, options) => {
  if (request.match(/\.(css|less|sass|scss)$/)) {
    return path.resolve(__dirname, "__mocks__/styleMock.js")
  }
  return options.defaultResolver(request, options)
}
