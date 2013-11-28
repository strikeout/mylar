Example of a self signed certificate to use with the extension. These certificates here work with the developer PK. The PK has to be passed into the bundler as an environment variable DEVELOPER_PK. For this certificate, the private key is 000000c12004626b9660b82694210edda6593c9894a99351d3b30d

calling example:

> DELELOPER_PK=000000c12004626b9660b82694210edda6593c9894a99351d3b30d meteor-enc run

or 

> DELELOPER_PK=000000c12004626b9660b82694210edda6593c9894a99351d3b30d meteor-enc deploy
