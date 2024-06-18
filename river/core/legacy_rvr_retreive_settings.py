import csv
import numpy as np

def rvr_retreive_settings(filename):
    batch_set=dict() #creating a dictionary
    with open(filename) as csvfile:
        readCSV = csv.reader(csvfile, delimiter=',')
        for row in readCSV:
            if row[0] == 'NAME STATION':
                batch_set["name_station"]=row[1]
            elif row[0] == 'FRAME STEP':
                batch_set["step_value"]=float(row[1])
            elif row[0] == 'FRAME START':
                batch_set["T0"]=float(row[1])
            elif row[0] == 'DURATION':
                batch_set["duration"]=float(row[1])
            elif row[0] == 'RESOLUTION':
                batch_set["resolution_ffmpeg"]=row[1]
            elif row[0] == 'PATH BATHYMETRY':
                batch_set["path_bathymetry"]=row[1]
            elif row[0] == 'PATH STAGES':
                batch_set["path_stages"]=row[1]
            elif row[0] == 'RW DIRECTION CS':
                direction_CS = row[1]
                direction_CS = direction_CS.replace("[", "[[")
                direction_CS = direction_CS.replace("]", "]]")
                direction_CS = direction_CS.replace(";", "][")
                direction_CS = direction_CS.replace("][", "],[")
                direction_CS = direction_CS.replace(" ]", "]")
                direction_CS = direction_CS.replace("[ ", "[")
                direction_CS = direction_CS.replace(" ", ",")
                direction_CS = eval("np.array(" + direction_CS + ")")
                batch_set["direction_CS"]=direction_CS
            elif row[0] == 'RW POINT CS':
                rw_punto_CS= row[1]
                rw_punto_CS = rw_punto_CS.replace("[", "[[")
                rw_punto_CS = rw_punto_CS.replace("]", "]]")
                rw_punto_CS  = rw_punto_CS .replace(";", "][")
                rw_punto_CS= rw_punto_CS.replace("][", "],[")
                rw_punto_CS = eval("np.array(" + rw_punto_CS + ")")
                batch_set["rw_punto_CS"]= rw_punto_CS
            elif row[0] == 'STATION POINT CS':
                batch_set["station_punto_CS"]=float(row[1])
            elif row[0] == 'DIST OVER CS':
                batch_set["dist_sl"]=float(row[1])
            elif row[0] == 'WIDTH ROI':
                batch_set["length_sl"]=float(row[1])
            elif row[0] == 'ID CS':
                batch_set["id_section"]=row[1]
            elif row[0] == 'PATH GRPS':
                batch_set["PathGRPS"]=row[1]
            elif row[0] == 'IMCOOR SYSTEM':
                batch_set["imcoor_sys"]=row[1]
            elif row[0] == 'MIN V':
                batch_set["min_V"]=float(row[1])
            elif row[0] == 'MAX V':
                batch_set["max_V"]= float(row[1])
            elif row[0] == 'ALPHA':
                batch_set["alpha"]=float(row[1])
            elif row[0] == 'LIST FOLDERS':
                batch_set["path_list_folders"]=row[1]
            elif row[0] == 'INTERROGATION AREA':
                batch_set["interrogationarea"]=float(row[1])
            elif row[0] == 'STEP PIV':
                batch_set["step"]=float(row[1])
            elif row[0] == 'PASSES':
                batch_set["passes"]=float(row[1])
            elif row[0] == 'INT2':
                batch_set["int2"]= float(row[1])
            elif row[0] == 'INT3':
                batch_set["int3"]=float(row[1])
            elif row[0] == 'INT4':
                batch_set["int4"]=float(row[1])
            elif row[0] == 'REPEAT':
                batch_set["repeat"]=float(row[1])
            elif row[0] == 'DISABLE AUTOCOR':
                batch_set["mask_auto"]=int(row[1])
            elif row[0] == 'DO PAD':
                batch_set["do_pad"]=int(row[1])
            elif row[0] == 'REMOVE FRAMES':
                batch_set["rm_frames"]=int(row[1])
            elif row[0] == 'VIDEO FILE':
                batch_set["file_path"]=row[1]
            elif row[0] == 'STAGE':
                batch_set["current_stage"]=float(row[1])
            elif row[0] == 'FRAME END':
                batch_set["TEND"]=float(row[1])
            elif row[0] == 'PIXEL SIZE':
                batch_set["pix_size"]=float(row[1])

    return batch_set

