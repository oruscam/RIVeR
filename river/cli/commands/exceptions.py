class RiverCLIException(Exception):
	pass


class WrongSizeTransformationMatrix(RiverCLIException):
	pass


class MissingWorkdir(RiverCLIException):
	pass
