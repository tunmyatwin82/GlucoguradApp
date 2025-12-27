import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from "react-native-chart-kit"; // Chart အတွက်
import { Appbar, Button, Card, Chip, List, RadioButton, Text, TextInput } from 'react-native-paper';
import { db } from '../../firebase';

// မျက်နှာပြင်အကျယ် (Chart အတွက်)
const screenWidth = Dimensions.get("window").width;

export default function App() {
  const [glucose, setGlucose] = useState('');
  const [mealType, setMealType] = useState('fasting'); // 'fasting' or 'afterMeal'
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], data: [] }); // Chart ဒေတာ
  const [isPremium, setIsPremium] = useState(false); // စမ်းသပ်ရန် False ထားပါ
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);

  // ១။ Database မှ ဒေတာများ ရယူခြင်း (Chart အတွက်ပါ ပြင်ဆင်ခြင်း)
  useEffect(() => {
    // နောက်ဆုံး ၁၀ ခုကိုပဲ ယူမယ် (Chart ကြည့်ကောင်းအောင်)
    const q = query(collection(db, "glucoseLogs"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);

      // Chart အတွက် ဒေတာ ပြင်ဆင်ခြင်း (အချိန်စဥ်လိုက် ပြန်စီပြီး နောက်ဆုံး ၅ ခုယူ)
      if (data.length > 0) {
        const reversedData = [...data].reverse().slice(-5); 
        setChartData({
          labels: reversedData.map(d => d.timeString), // ဝင်ရိုးမှာ အချိန်ပြမယ်
          data: reversedData.map(d => d.level) // ဒေတာ
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // ၂။ သွေးချိုအခြေအနေ ခွဲခြားခြင်း Logic (Meal Type ပေါ်မူတည်၍)
  const getStatus = (level, type) => {
    const val = parseInt(level);
    if (type === 'fasting') {
        // အစာမစားခင် Reference: 70-130 mg/dL
        if (val < 70) return { label: 'နည်းသည် (Low)', color: '#2196F3' };
        if (val <= 130) return { label: 'ပုံမှန် (Target)', color: '#4CAF50' };
        return { label: 'များသည် (High)', color: '#F44336' };
    } else {
        // အစာစားပြီး Reference: < 180 mg/dL
        if (val < 70) return { label: 'နည်းသည် (Low)', color: '#2196F3' };
        if (val <= 180) return { label: 'ပုံမှန် (Target)', color: '#4CAF50' };
        return { label: 'များသည် (High)', color: '#F44336' };
    }
  };

  // ၃။ ဒေတာသိမ်းခြင်း
  const saveLog = async () => {
    if (!glucose) return Alert.alert("သွေးချိုပမာဏ ထည့်ပါ");
    const statusInfo = getStatus(glucose, mealType);
    
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
  };

  // Payment Confirm ခလုတ်နှိပ်ရင် လုပ်မည့်အလုပ်
  const handleManualPaymentConfirm = () => {
    // လက်တွေ့တွင် - Firebase တွင် 'pending' status ဖြင့် သိမ်းရမည်။
    // MVP တွင် - Admin ထံ Screenshot ပို့ခိုင်းသည့် Alert ပြမည်။
    Alert.alert(
        "စစ်ဆေးနေဆဲ", 
        "ကျေးဇူးပြု၍ ငွေလွှဲ Screenshot ကို Admin ထံပေးပို့ပါ။ စစ်ဆေးပြီးပါက Premium အဆင့်သို့ မြှင့်တင်ပေးပါမည်။",
        [{ text: "OK", onPress: () => setPaymentModal(false) }]
    );
    // setIsPremium(true); // ချက်ချင်းမပေးသင့်ပါ
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

      <ScrollView style={{ padding: 15, paddingBottom: 30 }}>
        {/* မှတ်တမ်းသွင်းရန် Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={{marginBottom: 10}}>မှတ်တမ်းသစ်ထည့်ရန်</Text>
            
            {/* Meal Type Selection */}
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

             {/* Reference Text Display */}
            <Text style={styles.referenceText}>
                ℹ️ {mealType === 'fasting' ? "ရှိသင့်သောပမာဏ: 70 - 130 mg/dL" : "ရှိသင့်သောပမာဏ: < 180 mg/dL (စားပြီး ၂ နာရီ)"}
            </Text>
            
            <TextInput
              label="သွေးချိုပမာဏ (mg/dL)"
              value={glucose}
              onChangeText={setGlucose}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <Button mode="outlined" onPress={() => setShowPicker(true)} icon="calendar">
              အချိန်: {date.toLocaleDateString()} | {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Button>
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="datetime"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowPicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
            <Button mode="contained" onPress={saveLog} style={{ marginTop: 15, backgroundColor: '#6200ee' }}>
              မှတ်တမ်းသိမ်းမည်
            </Button>
          </Card.Content>
        </Card>

        {/* ခြုံငုံသုံးသပ်ချက် Chart (Premium Feature) */}
        <Text style={{ marginTop: 25, fontWeight: 'bold', marginBottom: 10 }}>📊 ခြုံငုံသုံးသပ်ချက် (Chart)</Text>
        <Card style={[styles.card, { backgroundColor: isPremium ? '#fff' : '#f8f8f8' }]}>
          <Card.Content style={{ alignItems: 'center' }}>
            {isPremium ? (
              chartData.data.length > 0 ? (
                <LineChart
                    data={{
                    labels: chartData.labels,
                    datasets: [{ data: chartData.data }]
                    }}
                    width={screenWidth - 60} // Card padding နှုတ်
                    height={220}
                    yAxisSuffix=" mg"
                    chartConfig={{
                    backgroundColor: "#fff",
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "6", strokeWidth: "2", stroke: "#6200ee" }
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
              ) : <Text style={{padding: 20}}>ဒေတာမလုံလောက်သေးပါ</Text>
            ) : (
              <View style={{padding: 20, alignItems: 'center'}}>
                  <Text style={{ color: 'grey', textAlign: 'center' }}>Premium ဝယ်ယူပြီး သွေးချိုအတက်အကျ ဇယားကို ကြည့်ရှုပါ။</Text>
                  <Button mode="text" onPress={() => setPaymentModal(true)}>Upgrade Now</Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* ယခင်မှတ်တမ်းများ List */}
        <Text style={{ marginTop: 25, fontWeight: 'bold' }}>ယခင်မှတ်တမ်းများ</Text>
        {logs.map((item) => {
          const statusInfo = getStatus(item.level, item.mealType);
          return (
            <List.Item
              key={item.id}
              title={`${item.level} mg/dL`}
              description={`${statusInfo.label} | ${item.mealType === 'fasting' ? 'အစာမစားခင်' : 'စားပြီး'} \n${item.dateString} ${item.timeString}`}
              descriptionNumberOfLines={2}
              left={props => <List.Icon {...props} icon="circle" color={statusInfo.color} />}
              style={styles.listItem}
            />
          );
        })}
        <View style={{height: 50}} /> 
      </ScrollView>

      {/* Payment Modal (QR Codes Images) */}
      <Modal visible={paymentModal} onRequestClose={() => setPaymentModal(false)} animationType="slide">
        <View style={styles.modalContainer}>
            <Appbar.Header style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => setPaymentModal(false)} />
                <Appbar.Content title="Premium Payment" />
            </Appbar.Header>
            
            <ScrollView contentContainerStyle={styles.modalContent}>
            <Text variant="headlineSmall" style={{ marginBottom: 10, fontWeight: 'bold', color: '#6200ee' }}>Premium Plan: 5,000 Ks</Text>
            <Text style={{ marginBottom: 20, textAlign: 'center', color: 'grey' }}>အောက်ပါ QR တစ်ခုခုကို Scan ဖတ်၍ ငွေလွှဲပါ။ ပြီးလျှင် Screenshot ကို Admin ထံ ပေးပို့ပါ။</Text>
            
            {/* QR Images (Assets ထဲတွင် ပုံများရှိရမည်) */}
            <View style={styles.qrWrapper}>
                <Text style={styles.qrTitle}>KBZPay</Text>
                {/* ပုံမရှိသေးရင် ဒီနေရာမှာ Error တက်ပါမယ်။ ပုံထည့်ပြီးမှ Comment ပြန်ဖွင့်ပါ */}
                {/* <Image source={require('../../assets/kbzpay.png')} style={styles.qrImage} resizeMode="contain" /> */}
                <View style={[styles.qrImage, {backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center'}]}><Text>KBZPay QR Placeholder</Text></View> 
            </View>

            <View style={styles.qrWrapper}>
                <Text style={styles.qrTitle}>WavePay</Text>
                {/* <Image source={require('../../assets/wavepay.png')} style={styles.qrImage} resizeMode="contain" /> */}
                <View style={[styles.qrImage, {backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center'}]}><Text>WavePay QR Placeholder</Text></View>
            </View>

            <Button mode="contained" onPress={handleManualPaymentConfirm} style={{ marginTop: 30, width: '100%', padding: 5, backgroundColor: '#4CAF50' }}>
                ငွေလွှဲပြီးပြီ (Screenshot ပို့မည်)
            </Button>
            </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { elevation: 2, borderRadius: 12, backgroundColor: 'white' },
  listItem: { backgroundColor: 'white', marginTop: 8, borderRadius: 8, elevation: 1, borderLeftWidth: 5, borderLeftColor: '#eee' },
  radioGroup: { flexDirection: 'row', marginBottom: 15, justifyContent: 'space-around' },
  radioItem: { flexDirection: 'row', alignItems: 'center' },
  referenceText: { backgroundColor: '#e3f2fd', padding: 10, borderRadius: 5, color: '#1565c0', marginBottom: 15, fontSize: 12 },
  
  // Payment Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalContent: { alignItems: 'center', padding: 20 },
  qrWrapper: { alignItems: 'center', marginBottom: 25, backgroundColor: '#fff', padding: 10, borderRadius: 10, elevation: 3 },
  qrTitle: { fontWeight: 'bold', marginBottom: 10 },
  qrImage: { width: 200, height: 200, borderRadius: 10 },
});