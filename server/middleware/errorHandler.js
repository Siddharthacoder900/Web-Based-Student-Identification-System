export function notFound(req, res) {
  res.status(404).json({ message: 'The requested API resource was not found.' })
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Please check the submitted information.', details: Object.values(error.errors).map(item => item.message) })
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'The requested record identifier is invalid.' })
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with that value already exists.' })
  }
  if (error.name === 'MulterError') {
    return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Photograph must be 5 MB or smaller.' : 'The photograph could not be uploaded.' })
  }
  console.error(error)
  res.status(error.status || 500).json({ message: error.status ? error.message : 'An unexpected server error occurred.' })
}
