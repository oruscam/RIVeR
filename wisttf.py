import csv


def wisttf(inpt_file, name, value):
    """Write In SeTTing File (WISTTF)
    path: is the path to the setting file
    name: is the case sentive Parameter name
    value: is the value as a string of the parameter"""

    with open(inpt_file, 'a+', newline='') as file:
        writer = csv.writer(file)
        writer.writerow([name, value])
