import { useState, useEffect } from 'react';
// Remove these imports as they're now in firebase-config.js
// import { initializeApp } from 'firebase/app';
// import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// Import Firebase configuration
import { auth, db } from './firebase-config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// Main application component
const App = () => {
  // Use state hooks to manage application data
  // Remove db and auth state as they're imported from firebase-config.js
  // const [db, setDb] = useState(null);
  // const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  
  const initialFormData = {
    checkinDate: '',
    checkoutDate: '',
    roomNumber: '',
    firstName: '',
    lastName: '',
    nationality: '',
    email: '',
    phoneNumber: '',
    idNumber: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [filterData, setFilterData] = useState(initialFormData);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomerId, setCurrentCustomerId] = useState(null);

  // State to manage which fields to export
  const [exportFields, setExportFields] = useState({
    checkinDate: true,
    checkoutDate: true,
    roomNumber: true,
    firstName: true,
    lastName: true,
    nationality: true,
    email: true,
    phoneNumber: true,
    idNumber: true,
  });

  // State for the file to be imported
  const [importFile, setImportFile] = useState(null);
  const [imageForEntry, setImageForEntry] = useState(null);
  const [imageFileForEntry, setImageFileForEntry] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [imageEntryData, setImageEntryData] = useState(initialFormData);
  
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Initialize Firebase and authenticate
  useEffect(() => {
    // Remove Firebase initialization as it's now in firebase-config.js
    // const firebaseConfig = JSON.parse(__firebase_config);
    // const app = initializeApp(firebaseConfig);
    // const firebaseAuth = getAuth(app);
    // const firebaseDb = getFirestore(app);
    
    // Set up authentication state listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          // Use anonymous sign-in instead of custom token
          await signInAnonymously(auth);
        } catch (error) {
          console.log('Authentication error:', error.message);
        }
      } else {
        setUserId(user.uid);
        
        // Use projectId directly instead of __app_id
        const appId = "YOUR_PROJECT_ID";
        
        // Set up Firestore listener for customers collection
        const customersRef = collection(db, `hotels/${appId}/customers`);
        const unsubscribeSnapshot = onSnapshot(customersRef, (snapshot) => {
          const customersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCustomers(customersData);
          setFilteredCustomers(customersData);
        }, (error) => {
          console.log('Firestore error:', error.message);
        });
        
        return () => {
          unsubscribeSnapshot();
        };
      }
    });
    
    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Effect hook for fetching customer data from Firestore
  useEffect(() => {
    if (!db || !userId) return;
    
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);

    const unsubscribeSnapshot = onSnapshot(customersCollectionRef, (snapshot) => {
      let customerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      customerList.sort((a, b) => new Date(b.checkinDate) - new Date(a.checkinDate));
      setCustomers(customerList);
    }, (error) => console.error("Error fetching documents:", error));

    return () => unsubscribeSnapshot();
  }, [db, userId]);

  // Effect hook to apply filtering
  useEffect(() => {
    let tempCustomers = [...customers];
    Object.keys(filterData).forEach(key => {
        if (filterData[key]) {
            if (key === 'checkinDate' || key === 'checkoutDate') {
                tempCustomers = tempCustomers.filter(c => c[key] === filterData[key]);
            } else {
                tempCustomers = tempCustomers.filter(c => c[key] && c[key].toLowerCase().includes(filterData[key].toLowerCase()));
            }
        }
    });
    setFilteredCustomers(tempCustomers);
  }, [customers, filterData]);

  // Handle various form and input changes
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleImageEntryChange = (e) => setImageEntryData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleFilterChange = (e) => setFilterData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleExportFieldChange = (e) => setExportFields(prev => ({ ...prev, [e.target.name]: e.target.checked }));
  const handleFileChange = (e) => setImportFile(e.target.files[0]);

  // Handle image selection for AI data entry
  const handleImageFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          setImageFileForEntry(file);
          setImageForEntry(URL.createObjectURL(file));
      }
  };

  // Handle add or update customer
  const handleAddOrUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!db || !userId) return alert("Application not ready.");

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    
    try {
        if (isEditing) {
            const customerDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, currentCustomerId);
            await updateDoc(customerDocRef, formData);
            alert("Customer updated successfully!");
            setIsEditing(false);
            setCurrentCustomerId(null);
        } else {
            const customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
            await addDoc(customersCollectionRef, { ...formData, createdAt: new Date().toISOString() });
        }
        setFormData(initialFormData);
    } catch (error) {
        console.error("Error saving document: ", error);
        alert("Error saving customer data.");
    }
  };
  
  // Set up the form for editing
  const handleEditCustomer = (customer) => {
      setIsEditing(true);
      setCurrentCustomerId(customer.id);
      setFormData({
          checkinDate: customer.checkinDate || '',
          checkoutDate: customer.checkoutDate || '',
          roomNumber: customer.roomNumber || '',
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          idNumber: customer.idNumber || '',
          nationality: customer.nationality || '',
          email: customer.email || '',
          phoneNumber: customer.phoneNumber || '',
      });
      window.scrollTo(0, 0); // Scroll to the top to see the form
  };

  // Cancel editing
  const cancelEdit = () => {
      setIsEditing(false);
      setCurrentCustomerId(null);
      setFormData(initialFormData);
  };

  // Open delete confirmation modal
  const handleDeleteCustomer = (customer) => {
      setCustomerToDelete(customer);
      setShowDeleteModal(true);
  };
  
  // Confirm deletion
  const confirmDelete = async () => {
    if (!db || !userId || !customerToDelete) return;
    try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const customerDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, customerToDelete.id);
        await deleteDoc(customerDocRef);
        alert("Customer deleted successfully!");
    } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Error deleting customer.");
    } finally {
        setShowDeleteModal(false);
        setCustomerToDelete(null);
    }
  };

  // Save the customer data after AI extraction
  const handleSaveCustomerFromImage = async (e) => {
      e.preventDefault();
      if (!db || !userId) return alert("Application not ready.");
      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
        await addDoc(customersCollectionRef, { ...imageEntryData, createdAt: new Date().toISOString() });
        setImageEntryData(initialFormData);
        setImageForEntry(null);
        setImageFileForEntry(null);
        document.getElementById('imageUpload').value = '';
        alert("Customer added successfully!");
      } catch (error) { console.error("Error adding document from image data: ", error); alert("Error saving customer data."); }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
  });

  const handleExtractDataFromImage = async () => {
      if (!imageFileForEntry) return alert("Please upload an image first.");
      setIsExtracting(true);
      try {
          const base64ImageData = await fileToBase64(imageFileForEntry);
          const apiKey = ""; 
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
          const payload = {
              contents: [{
                  parts: [
                      { text: "Extract the following information from the image and return it as a JSON object: firstName, lastName, nationality, email, phoneNumber, idNumber, checkinDate, checkoutDate, roomNumber. Use the field names exactly as provided. For 'Adi / Name', the first name is on top (Efe) and last name is below it (Mehmet)." },
                      { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
                  ]
              }],
              generationConfig: { responseMimeType: "application/json" }
          };
          const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
          const result = await response.json();
          const text = result.candidates[0].content.parts[0].text;
          const extractedData = JSON.parse(text);
          setImageEntryData(prev => ({ ...prev, ...extractedData }));
      } catch (error) { console.error("Error extracting data from image:", error); alert("Failed to extract data."); } 
      finally { setIsExtracting(false); }
  };

  const handleExportData = () => {
    const headers = Object.keys(exportFields).filter(field => exportFields[field]);
    if (headers.length === 0) return alert("Please select at least one field to export.");
    let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
    filteredCustomers.forEach(customer => {
      const row = headers.map(header => `"${(customer[header] || '').toString().replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'customer_data.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportData = () => {
    if (!importFile || !db || !userId) return alert("Please select a file and ensure the application is ready.");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rows = event.target.result.split(/\r?\n/).filter(row => row.trim() !== '');
      if (rows.length < 2) return alert("CSV file must have a header and data.");
      const headerMapping = { 'Check-in Date': 'checkinDate', 'Check-out Date': 'checkoutDate', 'Room Number': 'roomNumber', 'First Name': 'firstName', 'Last Name': 'lastName', 'Nationality': 'nationality', 'Email': 'email', 'Phone Number': 'phoneNumber', 'ID Number': 'idNumber' };
      const csvHeaders = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const customersToImport = rows.slice(1).map(row => {
        const values = row.split(',');
        const customer = {};
        csvHeaders.forEach((header, index) => {
          const appField = headerMapping[header];
          if (appField) customer[appField] = values[index] ? values[index].trim().replace(/"/g, '') : '';
        });
        return customer;
      });
      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
        const batch = writeBatch(db);
        customersToImport.forEach(c => Object.keys(c).length > 0 && batch.set(doc(customersCollectionRef), { ...c, createdAt: new Date().toISOString() }));
        await batch.commit();
        alert(`${customersToImport.length} customers imported successfully!`);
        document.getElementById('importFile').value = '';
      } catch (error) { console.error("Error importing documents: ", error); alert("Error importing data."); }
    };
    reader.readAsText(importFile);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans antialiased text-gray-800">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <p className="text-sm text-gray-500">User ID: <span className="font-mono text-xs break-all">{userId}</span></p>
        </div>
        <header className="text-center">
          <h1 className="text-4xl font-extrabold text-blue-600 mb-2">Hotel Customer Sign-in</h1>
          <p className="text-lg text-gray-600">Manage guest information efficiently.</p>
        </header>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-8">
            {/* Add/Edit Customer Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-blue-600 mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
              <form onSubmit={handleAddOrUpdateCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Check-in Date</label><input type="date" name="checkinDate" value={formData.checkinDate} onChange={handleFormChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/></div>
                  <div><label className="text-sm font-medium">Check-out Date</label><input type="date" name="checkoutDate" value={formData.checkoutDate} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/></div>
                  <input type="text" name="roomNumber" value={formData.roomNumber} onChange={handleFormChange} placeholder="Room Number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleFormChange} placeholder="First Name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleFormChange} placeholder="Last Name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                  <input type="text" name="idNumber" value={formData.idNumber} onChange={handleFormChange} placeholder="ID Number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                  <input type="text" name="nationality" value={formData.nationality} onChange={handleFormChange} placeholder="Nationality" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                  <input type="email" name="email" value={formData.email} onChange={handleFormChange} placeholder="Email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                  <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleFormChange} placeholder="Phone Number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                </div>
                <div className="flex gap-4">
                    <button type="submit" className="w-full py-2 px-4 rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">{isEditing ? 'Update Customer' : 'Save Customer'}</button>
                    {isEditing && <button type="button" onClick={cancelEdit} className="w-full py-2 px-4 rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600">Cancel</button>}
                </div>
              </form>
            </div>
            
            {/* Quick Add from Image Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-blue-600 mb-4">Quick Add from Image</h2>
                <input type="file" id="imageUpload" accept="image/*" onChange={handleImageFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"/>
                {imageForEntry && (
                    <div className="flex flex-col md:flex-row gap-4 mt-4">
                        <div className="flex-1"><img src={imageForEntry} alt="Registration Card" className="rounded-md shadow-sm max-h-96 w-full object-contain"/></div>
                        <div className="flex-1 space-y-3">
                            <button onClick={handleExtractDataFromImage} disabled={isExtracting} className="w-full py-2 px-4 rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400">
                                {isExtracting ? 'Extracting...' : 'Extract Data from Image'}
                            </button>
                            <form onSubmit={handleSaveCustomerFromImage} className="space-y-3">
                                <input type="date" name="checkinDate" value={imageEntryData.checkinDate} onChange={handleImageEntryChange} placeholder="Check-in Date" required className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="date" name="checkoutDate" value={imageEntryData.checkoutDate} onChange={handleImageEntryChange} placeholder="Check-out Date" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="text" name="roomNumber" value={imageEntryData.roomNumber} onChange={handleImageEntryChange} placeholder="Room Number" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="text" name="firstName" value={imageEntryData.firstName} onChange={handleImageEntryChange} placeholder="First Name" required className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="text" name="lastName" value={imageEntryData.lastName} onChange={handleImageEntryChange} placeholder="Last Name" required className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="text" name="idNumber" value={imageEntryData.idNumber} onChange={handleImageEntryChange} placeholder="ID Number" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="text" name="nationality" value={imageEntryData.nationality} onChange={handleImageEntryChange} placeholder="Nationality" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="email" name="email" value={imageEntryData.email} onChange={handleImageEntryChange} placeholder="Email" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <input type="tel" name="phoneNumber" value={imageEntryData.phoneNumber} onChange={handleImageEntryChange} placeholder="Phone Number" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                                <button type="submit" className="w-full py-2 px-4 rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">Save Extracted Data</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Import/Export and Filter Sections */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-blue-600 mb-4">Import & Filter</h2>
              <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Import from CSV</h3>
                    <div className="flex items-center space-x-4">
                        <input type="file" id="importFile" accept=".csv" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        <button onClick={handleImportData} className="py-2 px-4 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Import</button>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Filter Customers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="date" name="checkinDate" value={filterData.checkinDate} onChange={handleFilterChange} className="block w-full rounded-md border-gray-300 shadow-sm"/>
                        <input type="text" name="firstName" value={filterData.firstName} onChange={handleFilterChange} placeholder="Filter by First Name" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                        <input type="text" name="idNumber" value={filterData.idNumber} onChange={handleFilterChange} placeholder="Filter by ID Number" className="block w-full rounded-md border-gray-300 shadow-sm"/>
                        <input type="text" name="roomNumber" value={filterData.roomNumber} onChange={handleFilterChange} placeholder="Filter by Room No." className="block w-full rounded-md border-gray-300 shadow-sm"/>
                    </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-[2] space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-blue-600 mb-4">Customer List</h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
                <h3 className="font-semibold text-gray-700 mb-3">Export Options</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(exportFields).map(field => (
                    <label key={field} className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" name={field} checked={exportFields[field]} onChange={handleExportFieldChange} className="rounded"/>
                      <span className="text-gray-700 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
                <button onClick={handleExportData} className="mt-4 w-full sm:w-auto py-2 px-4 rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">Export Filtered Data</button>
              </div>
              <div className="overflow-x-auto relative rounded-lg">
                <table className="min-w-full divide-y">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest Info</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nationality</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in / out</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-100">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{customer.roomNumber}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{customer.firstName} {customer.lastName}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                             <div className="text-xs text-gray-500">{customer.phoneNumber}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{customer.idNumber}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{customer.nationality}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <div>IN: {customer.checkinDate}</div>
                            <div>OUT: {customer.checkoutDate}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleEditCustomer(customer)} className="flex items-center justify-center px-3 py-1 text-xs font-semibold text-white bg-indigo-500 rounded-md hover:bg-indigo-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                                    <span>Edit</span>
                                </button>
                                <button onClick={() => handleDeleteCustomer(customer)} className="flex items-center justify-center px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    <span>Delete</span>
                                </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="px-6 py-4 text-center">No customers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
                <p className="mt-2 text-sm text-gray-600">
                    Are you sure you want to delete the record for {customerToDelete?.firstName} {customerToDelete?.lastName}? This action cannot be undone.
                </p>
                <div className="mt-4 flex justify-end gap-4">
                    <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium">
                        Cancel
                    </button>
                    <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium">
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;


// Handle form submission for adding/updating customer
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form data
  if (!formData.firstName || !formData.lastName || !formData.roomNumber) {
    console.log('Please fill in all required fields: First Name, Last Name, and Room Number');
    return;
  }
  
  try {
    // Use projectId directly instead of __app_id
    const appId = "YOUR_PROJECT_ID";
    const customersRef = collection(db, `hotels/${appId}/customers`);
    
    if (isEditing && currentCustomerId) {
      // Update existing customer
      const customerRef = doc(db, `hotels/${appId}/customers`, currentCustomerId);
      await updateDoc(customerRef, formData);
      console.log('Customer updated successfully');
    } else {
      // Add new customer
      await addDoc(customersRef, formData);
      console.log('Customer added successfully');
    }
    
    // Reset form
    setFormData(initialFormData);
    setIsEditing(false);
    setCurrentCustomerId(null);
  } catch (error) {
    console.log('Error saving customer:', error.message);
  }
};

