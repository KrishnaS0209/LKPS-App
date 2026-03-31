import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/parent_service.dart';

class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});

  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _student;
  List<dynamic> _payments = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  String _formatCurrency(dynamic amount) {
    final value = double.tryParse(amount?.toString() ?? '0') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(value);
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    final sid = auth.user?.sid;
    final sessionId = auth.sessionId;
    final token = auth.token;

    if (sid == null || sessionId == null || token == null) {
      setState(() => _isLoading = false);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        ParentService.fetchStudentRecord(token: token, sessionId: sessionId, sid: sid),
        ParentService.fetchStudentPayments(token: token, sessionId: sessionId, sid: sid),
      ]);

      setState(() {
        _student = results[0] as Map<String, dynamic>?;
        _payments = results[1] as List<dynamic>;
      });
    } catch (e) {
      debugPrint('Error loading data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final paymentTotal = _payments.fold<double>(
      0,
      (sum, item) => sum + (double.tryParse(item['amt']?.toString() ?? '0') ?? 0),
    );

    final totalFee = double.tryParse(_student?['fee']?.toString() ?? '0') ?? 0;
    final remaining = totalFee - paymentTotal;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'FEE MANAGEMENT',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF8B5CF6),
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Payment History',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFDBE7F5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Fee Summary',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _SummaryRow(
                        label: 'Total Annual Fee',
                        value: _formatCurrency(totalFee),
                      ),
                      _SummaryRow(
                        label: 'Amount Paid',
                        value: _formatCurrency(paymentTotal),
                        valueColor: const Color(0xFF10B981),
                      ),
                      _SummaryRow(
                        label: 'Balance Due',
                        value: _formatCurrency(remaining),
                        valueColor: remaining > 0 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                        isLast: true,
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _student?['fst'] == 'Paid' ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _student?['fst'] == 'Paid' ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA),
                          ),
                        ),
                        child: Text(
                          'Status: ${_student?['fst'] ?? 'Pending'}',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: _student?['fst'] == 'Paid' ? const Color(0xFF15803D) : const Color(0xFFDC2626),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFDBE7F5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Payment Records',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (_payments.isEmpty)
                        const Text(
                          'No payment records found.',
                          style: TextStyle(color: Color(0xFF64748B)),
                        )
                      else
                        ..._payments.map((payment) {
                          final date = payment['date'] ?? payment['createdAt'];
                          final formattedDate = date != null
                              ? DateFormat('MMMM d, y').format(DateTime.parse(date))
                              : 'Date not available';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _formatCurrency(payment['amt']),
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFDBEAFE),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        payment['mode'] ?? payment['md'] ?? 'Cash',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF1E40AF),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  formattedDate,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                if (payment['rc'] != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Receipt No: ${payment['rc']}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF475569),
                                    ),
                                  ),
                                ],
                                if (payment['mn'] != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Note: ${payment['mn']}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF475569),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        }).toList(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool isLast;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(
                bottom: BorderSide(color: Color(0xFFF1F5F9)),
              ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 16,
              color: Color(0xFF64748B),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: valueColor ?? const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}
