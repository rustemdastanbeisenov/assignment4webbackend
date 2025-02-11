const MongoClient = require('mongodb').MongoClient;

const uri = "mongodb+srv://230714:qTe153mNP9@cluster0.ck4k8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri);

client.connect(err => {
	if (err) {
		console.error('Error connecting to MongoDB:', err);
		return;
	}
	console.log('Connected to MongoDB');
});