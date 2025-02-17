class RiverCoreException(Exception):
	pass


class VideoHasNoFrames(RiverCoreException):
	pass


class ObjectiveFunctionError(RiverCoreException):
	pass


class OptimalCameraMatrixError(RiverCoreException):
	pass


class NotSupportedFormatError(RiverCoreException):
	pass
