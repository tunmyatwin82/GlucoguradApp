import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { Appbar, Button, Card, Chip, List, RadioButton, Text, TextInput } from 'react-native-paper';
import { db } from '../../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

export default function App() {
  const [glucose, setGlucose] = useState('');
  const [mealType, setMealType] = useState('fasting'); 
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], data: [] });
  const [isPremium, setIsPremium] = useState(false); 
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);

  // ၁။ Database မှ ဒေတာများ ရယူခြင်း
  useEffect(() => {
    const q = query(collection(db, "glucoseLogs"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);

      if (data.length > 0) {
        const reversedData = [...data].reverse().slice(-5); 
        setChartData({
          labels: reversedData.map(d => d.timeString),
          data: reversedData.map(d => d.level)
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // ၂။ Android Picker Logic
  const showAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) setDate(selectedDate);
      },
      mode: 'datetime',
      is24Hour: true,
    });
  };

  // ၃။ သွေးချိုအခြေအနေ Reference Logic
  const getStatus = (level, type) => {
    const val = parseInt(level);
    if (type === 'fasting') {
        if (val < 70) return { label: 'နည်းသည် (Low)', color: '#2196F3' };
        if (val <= 130) return { label: 'ပုံမှန် (Target)', color: '#4CAF50' };
        return { label: 'များသည် (High)', color: '#F44336' };
    } else {
        if (val < 70) return { label: 'နည်းသည် (Low)', color: '#2196F3' };
        if (val <= 180) return { label: 'ပုံမှန် (Target)', color: '#4CAF50' };
        return { label: 'များသည် (High)', color: '#F44336' };
    }
  };

  // ၄။ ဒေတာသိမ်းခြင်း
  const saveLog = async () => {
    if (!glucose || isNaN(parseInt(glucose))) return Alert.alert("ဂဏန်းအမှန်အတိုင်း ထည့်ပါ");
    const statusInfo = getStatus(glucose, mealType);
    
    try {
        await addDoc(collection(db, "glucoseLogs"), {
            level: parseInt(glucose),
            mealType: mealType,
            status: statusInfo.label,
            timestamp: date.getTime(),
            dateString: date.toLocaleDateString(),
            timeString: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          setGlucose('');
          Alert.alert("အောင်မြင်သည်", "မှတ်တမ်းသိမ်းပြီးပါပြီ");
    } catch (e) {
        Alert.alert("Error", "Database သို့ သိမ်းဆည်း၍မရပါ");
    }
  };

  // ၅။ Telegram သို့ သွားမည့် Function
  const handleSendToTelegram = () => {
    const telegramUsername = "drtundmservice"; 
    const message = "GlycoGuard Premium အဆင့်မြှင့်ရန် ငွေလွှဲထားပါသည်။ ဤတွင် Screenshot တင်ပေးလိုက်ပါတယ်။";
    const url = `https://t.me/${telegramUsername}?text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Telegram App ကို ဖွင့်၍မရပါ။");
    });
    setPaymentModal(false);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: '#6200ee' }}>
        <Appbar.Content title="GlycoGuard Pro" color="white" />
        <Chip 
          onPress={() => setPaymentModal(true)} 
          style={{ backgroundColor: isPremium ? '#4CAF50' : '#FFC107', marginRight: 10 }}
        >
          {isPremium ? "Premium User" : "Upgrade Plan"}
        </Chip>
      </Appbar.Header>

      <ScrollView style={{ padding: 15 }}>
        {/* မှတ်တမ်းသွင်းရန် Form */}
        <Card style={styles.card}>
            <Card.Content>
            <Text variant="titleMedium" style={{marginBottom: 10}}>မှတ်တမ်းသစ်ထည့်ရန်</Text>
            <View style={styles.radioGroup}>
                <View style={styles.radioItem}>
                    <RadioButton value="fasting" status={ mealType === 'fasting' ? 'checked' : 'unchecked' } onPress={() => setMealType('fasting')} />
                    <Text onPress={() => setMealType('fasting')}>အစာမစားခင်</Text>
                </View>
                <View style={styles.radioItem}>
                    <RadioButton value="afterMeal" status={ mealType === 'afterMeal' ? 'checked' : 'unchecked' } onPress={() => setMealType('afterMeal')} />
                    <Text onPress={() => setMealType('afterMeal')}>အစာစားပြီး</Text>
                </View>
            </View>
            <Text style={styles.referenceText}>
                ℹ️ {mealType === 'fasting' ? "Target Range: 70 - 130 mg/dL" : "Target Range: < 180 mg/dL (စားပြီး ၂ နာရီ)"}
            </Text>
            <TextInput label="သွေးချိုပမာဏ (mg/dL)" value={glucose} onChangeText={setGlucose} keyboardType="numeric" mode="outlined" style={{ marginBottom: 15 }} />
            <Button mode="outlined" onPress={() => Platform.OS === 'android' ? showAndroidPicker() : setShowPicker(true)} icon="calendar" style={{marginBottom: 10}}>
               {date.toLocaleDateString()} | {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Button>
            <Button mode="contained" onPress={saveLog} style={{ backgroundColor: '#6200ee' }}>မှတ်တမ်းသိမ်းမည်</Button>
            </Card.Content>
        </Card>

        {/* Chart နှင့် Trends */}
        <Text style={styles.sectionTitle}>📊 ခြုံငုံသုံးသပ်ချက် (Trends)</Text>
        <Card style={[styles.card, { backgroundColor: isPremium ? '#fff' : '#f8f8f8' }]}>
            <Card.Content>
                {isPremium ? (
                    chartData.data.length > 0 ? (
                        <LineChart data={{ labels: chartData.labels, datasets: [{ data: chartData.data }] }} width={screenWidth - 60} height={220} yAxisSuffix=" mg" chartConfig={chartConfig} bezier style={{ borderRadius: 16 }} />
                    ) : <Text style={{textAlign: 'center', padding: 20}}>ဒေတာ မလုံလောက်သေးပါ</Text>
                ) : (
                    <View style={{padding: 20, alignItems: 'center'}}>
                        <Text style={{ color: 'grey', textAlign: 'center', marginBottom: 10 }}>Premium ဝယ်ယူပြီး အတက်အကျ ဇယားကို ကြည့်ပါ။</Text>
                        <Button mode="text" onPress={() => setPaymentModal(true)}>Upgrade to View Chart</Button>
                    </View>
                )}
            </Card.Content>
        </Card>

        {/* ယခင်မှတ်တမ်းများ */}
        <Text style={styles.sectionTitle}>📋 ယခင်မှတ်တမ်းများ</Text>
        {logs.map((item) => {
          const statusInfo = getStatus(item.level, item.mealType);
          return (
            <List.Item key={item.id} title={`${item.level} mg/dL`} description={`${statusInfo.label} | ${item.mealType === 'fasting' ? 'အစာမစားခင်' : 'စားပြီး'} \n${item.dateString} ${item.timeString}`} descriptionNumberOfLines={2} left={props => <List.Icon {...props} icon="water" color={statusInfo.color} />} style={styles.listItem} />
          );
        })}
        <View style={{height: 50}} /> 
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={paymentModal} onRequestClose={() => setPaymentModal(false)} animationType="slide">
        <View style={styles.modalContainer}>
            <Appbar.Header style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => setPaymentModal(false)} />
                <Appbar.Content title="Premium အဆင့်မြှင့်ရန်" />
            </Appbar.Header>
            
            <ScrollView contentContainerStyle={styles.modalContent}>
                <Text variant="headlineSmall" style={styles.priceTag}>Premium Plan: 5,000 Ks</Text>
                <Text style={styles.modalSubText}>အောက်ပါ QR များမှ အဆင်ပြေရာဖြင့် ငွေလွှဲပါ။ ပြီးလျှင် Telegram တွင် Screenshot ပို့ပေးပါ။</Text>
                
                {/* Horizontal QR Section */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.qrScroll}>
                    <View style={styles.qrWrapper}>
                        <Text style={styles.qrTitle}>KBZPay</Text>
                        <Image source={require('../../assets/images/kbzpay.jpg')} style={styles.qrImage} resizeMode="contain" />
                    </View>
                    <View style={styles.qrWrapper}>
                        <Text style={styles.qrTitle}>CBPay</Text>
                        <Image source={require('../../assets/images/cbpay.jpg')} style={styles.qrImage} resizeMode="contain" />
                    </View>
                    <View style={styles.qrWrapper}>
                        <Text style={styles.qrTitle}>AYAPay</Text>
                        <Image source={require('../../assets/images/ayapay.jpg')} style={styles.qrImage} resizeMode="contain" />
                    </View>
                </ScrollView>

                <View style={{ width: '100%', paddingHorizontal: 20 }}>
                    <Button 
                    mode="contained" 
                    onPress={handleSendToTelegram} 
                    style={styles.confirmButton}
                    icon="send" 
                    >
                    ငွေလွှဲပြီး Telegram သို့ သွားမည်
                    </Button>
                </View>
            </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const chartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "6", strokeWidth: "2", stroke: "#6200ee" }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { elevation: 2, borderRadius: 12, backgroundColor: 'white' },
  listItem: { backgroundColor: 'white', marginTop: 8, borderRadius: 8, elevation: 1, borderLeftWidth: 5, borderLeftColor: '#eee' },
  radioGroup: { flexDirection: 'row', marginBottom: 15, justifyContent: 'space-around' },
  radioItem: { flexDirection: 'row', alignItems: 'center' },
  referenceText: { backgroundColor: '#e3f2fd', padding: 10, borderRadius: 5, color: '#1565c0', marginBottom: 15, fontSize: 12, textAlign: 'center' },
  sectionTitle: { marginTop: 25, fontWeight: 'bold', marginBottom: 10 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalContent: { alignItems: 'center', paddingVertical: 20 },
  priceTag: { marginBottom: 10, fontWeight: 'bold', color: '#6200ee', textAlign: 'center' },
  modalSubText: { marginBottom: 20, textAlign: 'center', color: 'grey', fontSize: 14, paddingHorizontal: 20 },
  qrScroll: { paddingLeft: 20, marginBottom: 20 },
  qrWrapper: { alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, elevation: 4, width: screenWidth * 0.75, marginRight: 20, marginBottom: 10 },
  qrTitle: { fontWeight: 'bold', marginBottom: 10, fontSize: 16 },
  qrImage: { width: 200, height: 200 },
  confirmButton: { marginTop: 10, width: '100%', padding: 5, backgroundColor: '#4CAF50', marginBottom: 30 },
});