import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, ScrollView, Alert, TextInput, TouchableOpacity, Switch, Linking, Image, Dimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pdf from 'react-native-pdf';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [aba, setAba] = useState('biblioteca');
  const [livros, setLivros] = useState([]);
  const [livroAtual, setLivroAtual] = useState(null);
  const [texto, setTexto] = useState('Clique em ADICIONAR LIVRO para começar.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [rate, setRate] = useState(0.9);
  const [vozes, setVozes] = useState([]);
  const [vozSelecionada, setVozSelecionada] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [chatUrl, setChatUrl] = useState('https://chat.openai.com/');
  const [pdfPath, setPdfPath] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    Speech.getAvailableVoicesAsync().then(v => {
      const pt = v.filter(x => x.language.startsWith('pt'));
      setVozes(pt);
      setVozSelecionada(pt.find(x => x.language === 'pt-BR')?.identifier || pt[0]?.identifier);
    });
    carregarLivros();
    carregarConfig();
  }, []);

  const carregarLivros = async () => {
    const salvos = await AsyncStorage.getItem('biblioteca_v4');
    if (salvos) setLivros(JSON.parse(salvos));
  };

  const carregarConfig = async () => {
    const dark = await AsyncStorage.getItem('darkMode');
    const rateSalvo = await AsyncStorage.getItem('rate');
    if (dark) setIsDark(JSON.parse(dark));
    if (rateSalvo) setRate(parseFloat(rateSalvo));
  };

  const salvarLivros = async (novosLivros) => {
    setLivros(novosLivros);
    await AsyncStorage.setItem('biblioteca_v4', JSON.stringify(novosLivros));
  };

  const adicionarLivro = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true
      });

      if (!result.canceled) {
        const arquivo = result.assets[0];
        const novoLivro = {
          id: Date.now().toString(),
          nome: arquivo.name,
          uri: arquivo.uri,
          tipo: arquivo.mimeType,
          data: new Date().toLocaleDateString()
        };
        const novosLivros = [...livros, novoLivro];
        await salvarLivros(novosLivros);
        Alert.alert('Sucesso', 'Livro adicionado à biblioteca!');
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível adicionar o livro');
    }
  };

  const abrirLivro = async (livro) => {
    setLivroAtual(livro);
    if (livro.tipo === 'application/pdf') {
      setPdfPath(livro.uri);
      setAba('leitor');
    } else {
      const conteudo = await FileSystem.readAsStringAsync(livro.uri);
      setTexto(conteudo);
      setAba('leitor');
    }
  };

  const falar = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak(texto, {
        language: 'pt-BR',
        voice: vozSelecionada,
        rate: rate,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false)
      });
      setIsSpeaking(true);
    }
  };

  const deletarLivro = (id) => {
    Alert.alert('Deletar', 'Quer remover este livro?', [
      { text: 'Cancelar' },
      {
        text: 'Deletar',
        onPress: () => {
          const novosLivros = livros.filter(l => l.id!== id);
          salvarLivros(novosLivros);
        }
      }
    ]);
  };

  const toggleDark = () => {
    const novo =!isDark;
    setIsDark(novo);
    AsyncStorage.setItem('darkMode', JSON.stringify(novo));
  };

  const mudarRate = (novoRate) => {
    setRate(novoRate);
    AsyncStorage.setItem('rate', novoRate.toString());
  };

  const tema = {
    bg: isDark? '#1a1a1a' : '#f5f5f5',
    card: isDark? '#2d2d2d' : '#fff',
    texto: isDark? '#fff' : '#000',
    borda: isDark? '#444' : '#ddd',
    primario: '#6200ee'
  };

  const livrosFiltrados = livros.filter(l =>
    l.nome.toLowerCase().includes(termoBusca.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: tema.bg }]}>
      <View style={[styles.header, { backgroundColor: tema.primario }]}>
        <Text style={styles.titulo}>Leitor Pro Max</Text>
        <Switch value={isDark} onValueChange={toggleDark} />
      </View>

      <View style={styles.tabs}>
        {['biblioteca', 'leitor', 'ia', 'config'].map(t => (
          <TouchableOpacity key={t} onPress={() => setAba(t)} style={[styles.tab, aba === t && styles.tabAtiva]}>
            <Text style={[styles.tabTexto, aba === t && styles.tabTextoAtiva]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {aba === 'biblioteca' && (
        <View style={styles.content}>
          <TextInput
            style={[styles.input, { backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }]}
            placeholder="Buscar livro..."
            placeholderTextColor={isDark? '#888' : '#999'}
            value={termoBusca}
            onChangeText={setTermoBusca}
          />
          <Button title="ADICIONAR LIVRO PDF/TXT" onPress={adicionarLivro} color={tema.primario} />
          <ScrollView style={styles.lista}>
            {livrosFiltrados.map(livro => (
              <TouchableOpacity
                key={livro.id}
                style={[styles.cardLivro, { backgroundColor: tema.card, borderColor: tema.borda }]}
                onPress={() => abrirLivro(livro)}
                onLongPress={() => deletarLivro(livro.id)}
              >
                <Text style={[styles.nomeLivro, { color: tema.texto }]}>{livro.nome}</Text>
                <Text style={[styles.dataLivro, { color: isDark? '#aaa' : '#666' }]}>{livro.data}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {aba === 'leitor' && (
        <View style={styles.content}>
          {pdfPath? (
            <View style={{ flex: 1 }}>
              <Pdf
                source={{ uri: pdfPath }}
                onLoadComplete={(numberOfPages) => setNumPages(numberOfPages)}
                onPageChanged={(page) => setPaginaAtual(page)}
                style={[styles.pdf, { backgroundColor: tema.bg }]}
              />
              <Text style={[styles.paginacao, { color: tema.texto }]}>
                Página {paginaAtual} de {numPages}
              </Text>
            </View>
          ) : (
            <ScrollView style={[styles.areaTexto, { backgroundColor: tema.card, borderColor: tema.borda }]}>
              <Text style={[styles.textoLivro, { color: tema.texto }]}>{texto}</Text>
            </ScrollView>
          )}
          <View style={styles.controles}>
            <Button title={isSpeaking? "PARAR" : "LER"} onPress={falar} color={tema.primario} />
            <Text style={[styles.labelRate, { color: tema.texto }]}>Velocidade: {rate.toFixed(1)}x</Text>
            <View style={styles.botoesRate}>
              <Button title="-" onPress={() => mudarRate(Math.max(0.5, rate - 0.1))} />
              <Button title="+" onPress={() => mudarRate(Math.min(2.0, rate + 0.1))} />
            </View>
          </View>
        </View>
      )}

      {aba === 'ia' && (
        <View style={styles.content}>
          <TextInput
            style={[styles.input, { backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }]}
            placeholder="URL do Chat IA"
            placeholderTextColor={isDark? '#888' : '#999'}
            value={chatUrl}
            onChangeText={setChatUrl}
          />
          <Button title="ABRIR CHAT" onPress={() => Linking.openURL(chatUrl)} color={tema.primario} />
          <WebView source={{ uri: chatUrl }} style={styles.webview} />
        </View>
      )}

      {aba === 'config' && (
        <ScrollView style={styles.content}>
          <Text style={[styles.label, { color: tema.texto }]}>Voz do Leitor:</Text>
          {vozes.map(v => (
            <TouchableOpacity
              key={v.identifier}
              style={[styles.opcaoVoz, { backgroundColor: tema.card, borderColor: vozSelecionada === v.identifier? tema.primario : tema.borda }]}
              onPress={() => setVozSelecionada(v.identifier)}
            >
              <Text style={{ color: tema.texto }}>{v.name} - {v.language}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[styles.label, { color: tema.texto, marginTop: 20 }]}>Sobre:</Text>
          <Text style={[styles.sobre, { color: tema.texto }]}>Leitor Pro Max v1.0.0{"\n"}PDF + TTS + IA{"\n"}Segure um livro para deletar</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabAtiva: { borderBottomWidth: 3, borderColor: '#6200ee' },
  tabTexto: { fontSize: 12, color: '#666' },
  tabTextoAtiva: { color: '#6200ee', fontWeight: 'bold' },
  content: { flex: 1, padding: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  lista: { marginTop: 10 },
  cardLivro: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  nomeLivro: { fontSize: 16, fontWeight: 'bold' },
  dataLivro: { fontSize: 12, marginTop: 5 },
  pdf: { flex: 1, width: width - 20 },
  paginacao: { textAlign: 'center', padding: 10, fontWeight: 'bold' },
  areaTexto: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 15, marginBottom: 10 },
  textoLivro: { fontSize: 16, lineHeight: 24 },
  controles: { padding: 10 },
  labelRate: { textAlign: 'center', marginVertical: 10, fontWeight: 'bold' },
  botoesRate: { flexDirection: 'row', justifyContent: 'space-around' },
  webview: { flex: 1, marginTop: 10 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  opcaoVoz: { padding: 12, borderRadius: 8, borderWidth: 2, marginBottom: 8 },
  sobre: { fontSize: 14, lineHeight: 22 }
});
