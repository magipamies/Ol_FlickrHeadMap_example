# -*- coding: utf-8 -*-
u"""
Per poder importar la api flickrapi, he hagut de instal·lar. Per això he m'he
descarregat l'axriu des de la web i després he executat
sudo python setup.py install
"""
import flickr_api
import flickrapi
import json
import psycopg2
# load the psycopg extras module
import psycopg2.extras

api_key = u'c7283b05dfd6eebeaec640e22d21614c'
api_secret = u'fc75b56aca2b4afc'



flickr = flickrapi.FlickrAPI(api_key, api_secret, format='json')

raw_json = flickr.photos.search(bbox='1.0916,41.1177,1.1397,41.1778',
                                min_taken_date='01-01-2016',
                                extras='geo',
                                per_page=250,
                                page=1)
parsed = json.loads(raw_json.decode('utf-8'))

# Creem una variable que ens digui el número de pàgines que hem de consultar
pagines = parsed['photos']['pages']

# Creo una llista buida per guardar-hi les dades que descarregaré de l'arxiu json
llista = []

# Creo una variable que servirà per comptar el número de pàgina
n = 1

# Utilitzo el while per dir-li que executi una acció fins que arribi al número
# de pàgines que ens proporsiona dades la api de flickr
while n <= pagines:
    print u'pàgina ', n, ' de ', pagines # Per saber quantes pàgines tenim descargades
    # variables
    raw_json = flickr.photos.search(bbox='1.0916,41.1177,1.1397,41.1778',
                                    min_taken_date='01-01-2016',
                                    extras='geo',
                                    per_page=250,
                                    page=n)
    parsed = json.loads(raw_json.decode('utf-8'))
    for foto in parsed['photos']['photo']:
        llista.append((foto['id'], foto['longitude'], foto['latitude']))
    print len(llista), ' fotos de ', parsed['photos']['total']
    n+=1


# Conectar amb la base de dades
try:
    conn = psycopg2.connect("dbname='tfm' user='postgres' host='localhost' password='1234'")
except:
    print "No s'ha pogut conectar amb la base de dades"

cur = conn.cursor()

# Eliminenm les dades que guarda la taula, per poder introduir les noves
try:
    cur.execute("DELETE FROM tfm_table")
    print "Dades antigues eliminades"
except:
    print "Dades antigues no eliminades"


# Iserim les dades noves
try:
    cur.executemany("INSERT INTO tfm_table (id_foto, longitude, latitude) VALUES (%s, %s, %s)",
                     llista[:1250])
except:
        print "No s'han pogut inserir les dades a la taula"


# Inserim el valor de l'objecte geomètric
try:
    cur.execute("UPDATE tfm_table set obj_geom = ST_SetSRID(ST_MakePoint(longitude,latitude), 4326)")
    print u"Dades carregades"
except:
    print u"No s'ha pogut crear el punt geomètric"

# Li diem que ens guardi els canvis que hem fet a la base de dades
conn.commit()

# Tanquem la conexió amb la taula
if(conn):
    cur.close()
    conn.close()
    print u"Conexió tancada"
